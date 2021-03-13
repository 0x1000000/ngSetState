import { EventEmitter, SimpleChanges } from "@angular/core";
import { IWithState } from './../api/i_with_state';
import { Constructor, Constructor as IConstructor } from './../api/common';
import { AsyncState } from './async_state';
import { StateMeta, AsyncModifier, Modifier, isAsyncModifier, STATE_META, AsyncData, PropMeta} from './domain';
import { checkPromise, cmpByProp } from './utils';

export class Functions {
    
    public static initialize<TState>(component: IWithState<TState>, state: TState, ngInputs: string[] | null, ngOutputs: string[] | null) {

        if (component.state != null) {
            throw new Error("component should not have any initial state at this point");
        }
        if (state == null) {
            throw new Error("initial state should be defined");
        }

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(state);

        //CheckInputs

        if (ngInputs != null) {
            const inputCmp = Functions.compareArrays(stateMeta.inputs.map(i => i.componentProp), ngInputs);

            if (inputCmp.missedInArr1.length > 0) {
                throw new Error("Could not find the following inputs in the state class: " + inputCmp.missedInArr1.join(","));
            }
            if (inputCmp.missedInArr2.length > 0) {
                throw new Error("Could not find the following inputs in the component annotation: " + inputCmp.missedInArr2.join(","));
            }
        }

        if (ngOutputs != null) {
            const outCmp = Functions.compareArrays(stateMeta.outputs.map(i => i.componentProp), ngOutputs);

            if (outCmp.missedInArr1.length > 0) {
                throw new Error("Could not find the following outputs in the state class: " + outCmp.missedInArr1.join(","));
            }
            if (outCmp.missedInArr2.length > 0) {
                throw new Error("Could not find the following outputs in the component annotation: " + outCmp.missedInArr2.join(","));
            }
        }

        //Create component emitters
        for (const outputProp of stateMeta.outputs) {
            const emitterProp = outputProp.componentProp;

            if (component[emitterProp] == null) {
                component[emitterProp] = new EventEmitter<any>();
            }
        }

        //Set initial values for input component properties
        for (const inputProp of stateMeta.inputs) {
            component[inputProp.componentProp] = state[inputProp.stateProp];
        }


        //Push async init
        if (stateMeta.asyncInit != null) {
            const init = stateMeta.asyncInit;
            setTimeout(() => AsyncState.pushModifiers(component, [init], component.state, {}));
        }        
    }

    public static ngOnChanges<TState>(component: IWithState<TState>, changes: SimpleChanges): void {

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        let diff: Partial<TState> | null = null;
        for (const prop of stateMeta.inputs) {

            const change = changes[prop.componentProp];

            if (change && (change.currentValue !== component.state[prop.stateProp] || isEmittrer(prop))) {
                if (!diff) {
                    diff = {};
                }
                diff[prop.stateProp] = change.currentValue;
            }
        }

        if (diff) {
            Functions.nextState(component, diff);
        }

        function isEmittrer(p: PropMeta<TState>) {
            return stateMeta.emitters.indexOf(p.stateProp) >= 0;
        }
    }

    public static modifyState<TState, TK extends keyof TState>(component: IWithState<TState>, propName: TK, value: TState[TK]): boolean {
        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        if (component.state[propName] !== value || (stateMeta.emitters.length > 0 && stateMeta.emitters.indexOf(propName)>=0)) {
            const diff: Partial<TState> = {};
            diff[propName] = value;
            return Functions.nextState(component, diff);
        }
        return false;
    }

    public static nextState<TState>(component: IWithState<TState>, diff: Partial<TState> | null): boolean {
        if (diff == null) {
            return false;
        }

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        const previousState = component.state;

        const { newState, asyncModifiers, emitterProps } = Functions.updateCycle(stateMeta, previousState, diff, false);

        component.state = newState;

        let result = false;
        for (const output of stateMeta.outputs) {

            const emitOutput = !cmpByProp(previousState, component.state, output.stateProp) ||
                (emitterProps != null && emitterProps.indexOf(output.stateProp) >= 0);

            if (emitOutput) {
                Functions.emit(component, output, component.state[output.stateProp]);
            }
        }
        if (component.state !== previousState) {
            if (component.onAfterStateApplied) {
                component.onAfterStateApplied(previousState);
            }
            result = true;
        }

        if (asyncModifiers && asyncModifiers.length > 0) {
            AsyncState.pushModifiers(component, asyncModifiers, previousState, diff);
        }

        return result;
    }

    public static addModifier<TState>(target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor, propNames: (keyof TState)[], asyncData: AsyncData | null) {
        const stateMeta = Functions.ensureStateMeta(target);
        let modifier: Modifier<TState> | AsyncModifier<TState> = descriptor.value;
    
        if (asyncData) {
            const original = modifier;
            modifier = function (...args: any[]) {
                return original.apply(this, args);
            };
            (<AsyncModifier<TState>><any>modifier).asyncData = asyncData;
        }
    
        for (const propName of propNames) {
            let detect = false;
            for (const m of stateMeta.modifiers) {
    
                if (m.prop === propName) {
                    if (m.fun.indexOf(modifier)>=0) {
                        throw new Error(`Modifier with name '${propertyKey}' has been already declared`);
                    }
                    m.fun.push(modifier);
                    detect = true;
                }
            }
    
            if (!detect) {
                stateMeta.modifiers.push({ prop: propName, fun: [modifier] });
            }
        }
    }    

    public static updateCycle<TState>(stateMeta: StateMeta<TState>, previousState: TState, diff: Partial<TState>, freeze: boolean)
        : { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null, emitterProps: (keyof TState)[] | null }
    {
        if (diff == null) {
            return { newState: previousState, asyncModifiers: null, emitterProps: null }
        }
        const currentState = Functions.cloneStateObject(previousState, diff, stateMeta, freeze);

        if (currentState === previousState && stateMeta.emitters.length < 0) {
            return { newState: currentState, asyncModifiers: null, emitterProps: null };
        }

        return Functions.applyModifiersCycle(stateMeta, currentState, previousState, diff, freeze);
    }

    private static applyModifiersCycle<TState>(stateMeta: StateMeta<TState>, currentState: TState, previousState: TState, diff: Partial<TState>, freeze: boolean)
        : { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null, emitterProps: (keyof TState)[] }
    {
        let watchDog = 1000;
        let diffKeys = Object.keys(diff) as (keyof TState)[];
        let modifiers: (Modifier<TState> | AsyncModifier<TState>)[] = Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, null);

        let asyncModifiers: AsyncModifier<TState>[] | null = null;

        const emitterProps: (keyof TState)[] = [];
        addEmitters(diffKeys);

        while (watchDog > 0) {
            if (modifiers.length < 1) {
                return { newState: currentState, asyncModifiers: asyncModifiers, emitterProps};
            }
            const modifiersAcc: Modifier<TState>[] = [];
            for (const modifier of modifiers) {
                if (isAsyncModifier(modifier)) {
                    if (!asyncModifiers) {
                        asyncModifiers = [];
                    }
                    asyncModifiers.push(modifier);
                    continue;
                }

                diff = modifier.apply(currentState, [currentState, previousState, diff]);
                if (checkPromise(diff)) {
                    throw new Error(`All functions which return promises and are marked with "@With" should be also marked with "@Async"`);
                }
                if (diff != null) {

                    diffKeys = Object.keys(diff) as (keyof TState)[];
                    addEmitters(diffKeys);

                    const hasChanges: boolean = diffKeys.some(dk => !cmpByProp(previousState, diff as TState, dk))
                        || Functions.diffHasEmitter(diffKeys, null, stateMeta);

                    if (hasChanges) {
                        previousState = currentState;
                        currentState = Functions.cloneStateObject(previousState, diff, stateMeta, freeze);
                        Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, modifiersAcc);
                    }
                }
            }
            modifiers = modifiersAcc;
            watchDog--;
        }
        throw new Error("Recursion overflow");


        function addEmitters(keys: (keyof TState)[]) {
            if (stateMeta.emitters.length > 0) {
                for (const e of stateMeta.emitters) {
                    if (emitterProps.indexOf(e) >= 0) {
                        continue;
                    }
                    if (keys.indexOf(e) < 0) {
                        continue;
                    }
                    emitterProps.push(e);
                }
            }
        }
    }

    private static findModifiers<TState>(stateMeta: StateMeta<TState>, newState: TState, previousState: TState, diffKeys: (keyof TState)[], modifiersAcc: Modifier<TState>[] | null): (Modifier<TState> | AsyncModifier<TState>)[] {
        const acc: (Modifier<TState> | AsyncModifier<TState>)[] = modifiersAcc == null ? [] : modifiersAcc;

        for (const modifier of stateMeta.modifiers) {
            /*Even if the key is in diff it does not mean that the property is actually changed*/
            if (diffKeys.some(dk => modifier.prop === dk && ((!cmpByProp(previousState, newState, dk)) || Functions.diffHasEmitter(diffKeys, dk, stateMeta)))) {
                for (const modifierFun of modifier.fun) {
                    if (acc.indexOf(modifierFun) < 0) {
                        acc.push(modifierFun);
                    }
                }
            }
        }

        return acc;
    }

    private static diffHasEmitter<TState>(diffKeys: (keyof TState)[], specificKey: (keyof TState) | null, stateMeta: StateMeta<TState>): boolean {
        if (specificKey != null) {
            if (diffKeys.indexOf(specificKey) < 0) {
                return false;
            }
        }
        return stateMeta.emitters.length > 0 && stateMeta.emitters.some(eKey => diffKeys.indexOf(eKey)>=0);
    }

    private static emit<TState>(component: IWithState<TState>, prop: PropMeta<TState>, value: any): void {
        const emitter = Functions.checkEmitter(component, prop.componentProp);

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

    public static ensureStateMeta<TState extends Object>(obj: TState | IConstructor<TState>): StateMeta<TState> {
        if (obj == null) {
            throw new Error("State host should be initialized");
        }

        const cons = typeof obj === "function" ? obj : obj.constructor;

        if (cons[STATE_META]) {
            return cons[STATE_META];
        }

        const stateMeta: StateMeta<TState> = {
            stateConstructor: null,
            inputs: [],
            outputs: [],
            emitters: [],
            emitterMaps: {},
            modifiers: [],
            explicitStateProps: [],
            asyncInit: null
        };

        cons[STATE_META] = stateMeta;

        return stateMeta;
    }

    private static cloneStateObject<TState>(previousState: TState, diff: Partial<TState>, stateMeta: StateMeta<TState>, freeze: boolean): TState {

        //Check changes
        if (diff == null) {
            return previousState;
        }
        const diffProperties = Object.getOwnPropertyNames(diff);
        if (diffProperties == null || diffProperties.length < 0) {
            return previousState;
        }
        if (diffProperties.every(dp => previousState[dp] === diff[dp])) {
            return previousState;
        }
        let result: TState;
        if (stateMeta.stateConstructor) {
            const newInstance = Object.create(stateMeta.stateConstructor.prototype);
            Object.assign(newInstance, previousState, diff);
            result = newInstance;
        }
        else {
            result = Object.assign({}, previousState, diff);
        }

        if (freeze) {
            Object.freeze(result);
        }
        return result;
    }

    private static compareArrays<T>(arr1: T[], arr2: T[]): { missedInArr1: T[], missedInArr2: T[] } {
        const result = { missedInArr1: [] as T[], missedInArr2: [] as T[] };

        if (arr1 != null || arr2 != null) {
            if (arr1 == null) {
                result.missedInArr1 = arr2;
            }
            else if (arr2 == null) {
                result.missedInArr2 = arr1;
            } else {
                result.missedInArr1 = arr2.filter(i => arr1.indexOf(i) < 0);
                result.missedInArr2 = arr1.filter(i => arr2.indexOf(i) < 0);
            }
        }
        return result;
    }
}
