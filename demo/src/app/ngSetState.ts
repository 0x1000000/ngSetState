import { OnChanges, SimpleChanges, EventEmitter, Type, Output } from "@angular/core";

export interface IWithState<TState> extends OnChanges {
    state: TState;

    modifyState(propName: keyof TState, value: any): void;

    onAfterStateApplied?(): void;
}

export abstract class WithStateBase<TState> implements IWithState<TState> {

    constructor(initialState: TState) {
        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(initialState);
        stateMeta.stateConstructor = <Constructor<TState>>initialState.constructor;
        Functions.initialize(this, initialState);

        this.state = initialState;
    }

    public state: TState;

    public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): void {
        Functions.modifyState(this, propName, value);
    }
    public ngOnChanges(changes: SimpleChanges): void {
        Functions.ngOnChanges(this, changes);
    }    
}

export function WithState<TState>(stateType: Constructor<TState>, factory?: () => TState): (t: Constructor<any>) => any {

    if (stateType == null) {
        throw new Error("Initial state type should be defined or a factory provided");
    }

    const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(stateType);
    stateMeta.stateConstructor = stateType;

    return (target: NgComponentType) => {
        return class extends target implements IWithState<TState> {

            public state: TState = (() => {

                const initialState = factory != null ? factory() : new stateType();

                Functions.initialize(this, initialState);

                return initialState;
            })();

            public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): void {
                Functions.modifyState(this, propName, value);
            }

            public ngOnChanges(changes: SimpleChanges): void {

                Functions.ngOnChanges(this, changes);

                if (super.ngOnChanges) {
                    super.ngOnChanges(changes);
                }
            }
        };
    };
}

export function In<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.inputs.findIndex(i=>i.stateProp === propertyKey) >= 0) {
            throw new Error(`Input with name '${propertyKey}' has been alredy declared`);
        }

        stateMeta.inputs.push({ stateProp: propertyKey, componentProp: componentProp ? componentProp  : (propertyKey as string) });
    };
}

export function Out<TState>(): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.outputs.indexOf(propertyKey) >= 0) {
            throw new Error(`Output with name '${propertyKey}' has been alredy declared`);
        }

        stateMeta.outputs.push(propertyKey);
    };
}

export function With<TState>(...propNames: (keyof TState)[]) {

    return (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
        const stateMeta = Functions.ensureStateMeta(target);

        const modifier: Modifier<TState> = descriptor.value;

        for (const propName of propNames) {

            let detect = false;
            for (const m of stateMeta.modifiers) {

                if (m.prop === propName) {
                    if (m.fun.includes(modifier)) {
                        throw new Error(`Modifier with name '${propertyKey}' has been alredy declared`);
                    }
                    m.fun.push(modifier);
                    detect = true;
                }
            }

            if (!detect) {
                stateMeta.modifiers.push({ prop: propName, fun: [modifier] });
            }
        }
    };
}

class Functions {

    public static initialize<TState>(component: IWithState<TState>, state: TState) {

        if (component.state != null) {
            throw new Error("component should not have any initial state at this point");
        }
        if (state == null) {
            throw new Error("initial state should be defined");
        }

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(state);

        //Create emitters
        for (const outputProp of stateMeta.outputs) {

            const emitterProp = outputProp + EMITTER_SUFFIX;
            if (component[emitterProp] == null) {
                component[emitterProp] = new EventEmitter<any>();
            }
        }

        //Set initial values
        for (const inputProp of stateMeta.inputs) {
            component[inputProp.componentProp] = state[inputProp.stateProp];
        }
    }

    public static ngOnChanges<TState>(component: IWithState<TState>, changes: SimpleChanges): void {

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        let diff: Partial<TState> | null = null;
        for (const prop of stateMeta.inputs) {

            const change = changes[prop.componentProp];

            if (change && change.currentValue !== component.state[prop.stateProp]) {
                if (!diff) {
                    diff = {};
                }
                diff[prop.stateProp] = change.currentValue;
            }
        }

        if (diff) {
            Functions.nextState(component, diff);
        }
    }

    public static modifyState<TState, TK extends keyof TState>(component: IWithState<TState>, propName: TK, value: TState[TK]): void {
        if (component.state[propName] !== value) {
            const diff: Partial<TState> = {};
            diff[propName] = value;
            Functions.nextState(component, diff);
        }
    }

    public static nextState<TState>(component: IWithState<TState>, diff: Partial<TState>): void {
        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        const previousState = component.state;

        component.state = Functions.updateCycle(stateMeta, component, previousState, diff);

        for (const output of stateMeta.outputs) {
            if (previousState[output] !== component.state[output]) {
                Functions.emit(component, output, component.state[output]);
            }
        }

        if (component.onAfterStateApplied) {
            component.onAfterStateApplied();
        }
    }

    private static updateCycle<TState>(stateMeta: StateMeta<TState>, component: IWithState<TState>, previousState: TState, diff: Partial<TState>): TState {

        let watchDog = 1000;

        while (watchDog > 0) {
            if (diff == null) {
                return previousState;
            }

            const diffKeys = Object.keys(diff);

            let newState = Functions.cloneStateObject(previousState, diff, stateMeta);

            let cumulativeModDiff: Partial<TState> | null = null;

            for (const modifier of stateMeta.modifiers) {

                if (diffKeys.some(dk => modifier.prop === dk)) {
                    for (const fun of modifier.fun) {
                        const localDiff = fun.apply(newState, [newState, previousState, diff]);
                        if (localDiff != null) {

                            const localDiffKeys = Object.keys(localDiff);
                            if (!localDiffKeys.every(diffKey => previousState[diffKey] === localDiff[diffKey])) {
                                if (!cumulativeModDiff) {
                                    cumulativeModDiff = {};
                                }

                                Object.assign(cumulativeModDiff, localDiff);

                                previousState = newState;
                                newState = Functions.cloneStateObject(previousState, diff, stateMeta);
                            }
                        }
                    }
                }
            }
            if (cumulativeModDiff == null) {
                return newState;
            }

            previousState = newState;
            diff = cumulativeModDiff;
            watchDog--;
        }
        throw new Error("Recursion overflow");
    }

    private static emit<TState>(component: IWithState<TState>, prop: keyof TState, value: any): void {

        let emitter: EventEmitter<any> | null = null;

        emitter = Functions.checkEmitter(component, prop as string);

        if (!emitter) {
            emitter = Functions.checkEmitter(component, prop as string + EMITTER_SUFFIX);
        }

        if (!emitter) {
            throw new Error(`Could not find any emitter for "${prop}"`);
        }

        emitter.emit(value);
    }

    private static checkEmitter<TState>(component: IWithState<TState>, name: string): EventEmitter<any> | null {
        const emitter = component[name];
        if (emitter && typeof emitter.emit === "function") {
            return emitter;
        }
        return null;
    }

    public static ensureStateMeta<TState>(obj: TState | Constructor<TState>): StateMeta<TState> {
        if (obj == null) {
            throw new Error("State should be initialized");
        }

        const cons = typeof obj === "function" ? obj : obj.constructor;


        if (cons[STATE_META]) {
            return cons[STATE_META];
        }

        const stateMeta: StateMeta<TState> = { stateConstructor: null, inputs: [], outputs: [], modifiers: [] };

        cons[STATE_META] = stateMeta;

        return stateMeta;
    }

    private static cloneStateObject<TState>(previousState: TState, diff: Partial<TState>, stateMeta: StateMeta<TState>): TState {

        if (stateMeta.stateConstructor) {
            const newInstance = Object.create(stateMeta.stateConstructor.prototype);
            Object.assign(newInstance, previousState, diff);
            return newInstance;
        }
        return Object.assign({}, previousState, diff);
    }
}

const STATE_META = "__state_meta__";

const EMITTER_SUFFIX = "Change";

interface Constructor<T> { new(...args: any[]): T; }

interface NgComponentType extends Constructor<OnChanges> {}

interface InputMeta<TState> {
    readonly stateProp: keyof TState,
    readonly componentProp: string,
}

interface StateMeta<TState> {
    stateConstructor: Constructor<TState> | null;
    inputs: InputMeta<TState>[];
    outputs: (keyof TState)[];
    modifiers: { prop: (keyof TState), fun: Modifier<TState>[] }[];
}

type Modifier<TState> = (currentSate: TState, previousSate: TState, diff: Partial<TState>) => TState| null;
