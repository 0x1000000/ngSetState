import { OnChanges, SimpleChanges, EventEmitter, Type, Output } from "@angular/core";

export interface IWithState<TState> extends OnChanges {

    state: TState;

    modifyState(propName: keyof TState, value: any): void;

    onAfterStateApplied?(): void;
}

export function WithState<TState>(stateType: Constructor<TState>, factory?: () => TState): (t: Constructor<any>) => any {

    if (stateType == null) {
        throw new Error("Initial state type should be defined or a factory provided");
    }

    const stateMeta = ensureStateMeta<TState>(stateType);

    stateMeta.stateConstructor = stateType;

    return (target: NgComponentType) => {


        // Definition of angular Input-s Output-s
        //for (const inputProp of stateMeta.inputs) {
        //    if (!target.ngBaseDef || (target.ngBaseDef.inputs && !target.ngBaseDef.inputs.hasOwnProperty(inputProp))) {
        //        const ngPropDecorator: (t: any, prop: string) => any = Input();
        //        ngPropDecorator(target.prototype,  inputProp as string);
        //    }
        //}
        //for (const outputProp of stateMeta.outputs) {
        //    if (!target.ngBaseDef || (target.ngBaseDef.outputs && !target.ngBaseDef.outputs.hasOwnProperty(outputProp))) {
        //        const ngPropDecorator: (t: any, prop: string) => any = Output();
        //        ngPropDecorator(target.prototype,  outputProp as string + EMITTER_SUFFIX);
        //    }
        //}

        return class extends target implements IWithState<TState> {

            public state: TState = (() => {

                let initialState: TState;

                if (factory != null) {
                    initialState = factory();
                } else {
                    initialState = new stateType();
                }                

                //Create emitters
                for (const outputProp of stateMeta.outputs) {

                    const emitterProp = outputProp + EMITTER_SUFFIX;
                    if (this[emitterProp] == null) {
                        this[emitterProp] = new EventEmitter<any>();
                    }
                }

                //Set initial values
                for (const inputProp of stateMeta.inputs) {
                    this[inputProp.componentProp] = initialState[inputProp.stateProp];
                }

                return initialState;
            })();

            public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): void {

                if (this.state[propName] !== value) {
                    const diff: Partial<TState> = {};
                    diff[propName] = value;
                    this.nextState(diff);
                }
            }

            public ngOnChanges(changes: SimpleChanges): void {

                let diff: Partial<TState> | null = null;
                for (const prop of stateMeta.inputs) {

                    const change = changes[prop.componentProp];

                    if (change && change.currentValue !== this.state[prop.stateProp]) {
                        if (!diff) {
                            diff = {};
                        }

                        diff[prop.stateProp] = change.currentValue;
                    }
                }

                if (diff) {
                    this.nextState(diff);
                }

                if (super.ngOnChanges) {
                    super.ngOnChanges(changes);
                }
            }

            private nextState(diff: Partial<TState>): void {
                const previousState = this.state;

                this.state = this.updateCycle(previousState, diff);

                for (const output of stateMeta.outputs) {
                    if (previousState[output] !== this.state[output]) {
                        this.emit(output, this.state[output]);
                    }
                }

                const asInterface =  this as IWithState<TState>;

                if (asInterface.onAfterStateApplied) {
                    asInterface.onAfterStateApplied();
                }
            }

            private updateCycle(previousState: TState, diff: Partial<TState>): TState {

                let watchDog = 1000;

                while (watchDog > 0) {
                    if (diff == null) {
                        return previousState;
                    }

                    const diffKeys = Object.keys(diff);

                    let newState = cloneStateObject(previousState, diff, stateMeta);

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
                                        newState = cloneStateObject(previousState, diff, stateMeta);
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

            private emit(prop: keyof TState, value: any): void {

                let emitter: EventEmitter<any> | null = null;

                emitter = this.checkEmitter( prop as string);

                if (!emitter) {
                    emitter = this.checkEmitter( prop as string + EMITTER_SUFFIX);
                }

                if (!emitter) {
                    throw new Error(`Could not find any emitter for "${prop}"`);
                }

                emitter.emit(value);
            }

            private checkEmitter(name: string): EventEmitter<any> | null {
                const emitter = this[name];
                if (emitter && typeof emitter.emit === "function") {
                    return emitter;
                }
                return null;
            }
        };
    };
}

export function In<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = ensureStateMeta(target);

        if (stateMeta.inputs.findIndex(i=>i.stateProp === propertyKey) >= 0) {
            throw new Error(`Input with name '${propertyKey}' has been alredy declared`);
        }

        stateMeta.inputs.push({ stateProp: propertyKey, componentProp: componentProp ? componentProp  : (propertyKey as string) });
    };
}

export function Out<TState>(): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = ensureStateMeta(target);

        if (stateMeta.outputs.indexOf(propertyKey) >= 0) {
            throw new Error(`Output with name '${propertyKey}' has been alredy declared`);
        }

        stateMeta.outputs.push(propertyKey);
    };
}

export function With<TState>(...propNames: (keyof TState)[]) {

    return (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
        const stateMeta = ensureStateMeta(target);

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

function ensureStateMeta<TState>(obj: TState|Constructor<TState>): StateMeta<TState> {
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

function cloneStateObject<TState>(previousState: TState, diff: Partial <TState>, stateMeta: StateMeta<TState>): TState {

    if (stateMeta.stateConstructor) {
        const newInstance = Object.create(stateMeta.stateConstructor.prototype);
        Object.assign(newInstance, previousState, diff);
        return newInstance;
    }
    return Object.assign({}, previousState, diff);
}

const STATE_META = "__state_meta__";

const EMITTER_SUFFIX = "Change";

interface Constructor<T> { new(...args: any[]): T; }

interface NgBaseDef {
    inputs: {};
    outputs: {};
    declaredInputs: {};
}

interface NgComponentType extends Constructor<OnChanges> {
    ngBaseDef: NgBaseDef;
    "__annotations__": [{inputs: string[]}];
}

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
