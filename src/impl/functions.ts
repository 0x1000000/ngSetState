import { EventEmitter, SimpleChanges, ɵɵNgOnChangesFeature } from "@angular/core";
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

        //Compatibility with IVY
        if (ɵɵNgOnChangesFeature != null) {
			const componentDef = (<any>component).constructor.ɵcmp;
			if(componentDef != null){
                ɵɵNgOnChangesFeature()(componentDef);
			}
        }

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

    public static modifyState<TState, TK extends keyof TState>(component: IWithState<TState>, propName: TK, value: TState[TK]): boolean {
        if (component.state[propName] !== value) {
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

        const { newState, asyncModifiers} = Functions.updateCycle(stateMeta, previousState, diff);

        component.state = newState;

        let result = false;
        if (component.state !== previousState) {
            for (const output of stateMeta.outputs) {
                if (previousState[output.stateProp] !== component.state[output.stateProp]) {
                    Functions.emit(component, output, component.state[output.stateProp]);
                }
            }

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

    private static updateCycle<TState>(stateMeta: StateMeta<TState>, previousState: TState, diff: Partial<TState>): { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null } {
        if (diff == null) {
            return {newState: previousState, asyncModifiers: null }
        }
        const currentState = Functions.cloneStateObject(previousState, diff, stateMeta);

        return Functions.applyModifiersCycle(stateMeta, currentState, previousState, diff);
    }

    private static applyModifiersCycle<TState>(stateMeta: StateMeta<TState>, currentState: TState, previousState: TState, diff: Partial<TState>): { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null} {
        let watchDog = 1000;
        let diffKeys = Object.keys(diff);
        let modifiers: (Modifier<TState> | AsyncModifier<TState>)[] = Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, null);

        let asyncModifiers: AsyncModifier<TState>[]|null = null;

        while (watchDog > 0) {

            if (modifiers.length < 1) {
                return { newState: currentState, asyncModifiers: asyncModifiers };
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

                    diffKeys = Object.keys(diff);

                    if (diffKeys.some(diffKey => previousState[diffKey] !== diff[diffKey])) {
                        previousState = currentState;
                        currentState = Functions.cloneStateObject(previousState, diff, stateMeta);
                        Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, modifiersAcc);
                    }
                }
            }
            modifiers = modifiersAcc;
            watchDog--;
        }
        throw new Error("Recursion overflow");
    }

    private static findModifiers<TState>(stateMeta: StateMeta<TState>, newState: TState, previousState: TState, diffKeys: string[], modifiersAcc: Modifier<TState>[] | null): (Modifier<TState> | AsyncModifier<TState>)[] {
        const acc: (Modifier<TState>|AsyncModifier<TState>)[] = modifiersAcc == null ? [] : modifiersAcc;

        for (const modifier of stateMeta.modifiers) {
            if (diffKeys.some(dk => modifier.prop === dk && !cmpByProp(previousState, newState, dk) /*Even if the key is in diff it does not mean that the property is actually changed*/)) {
                for (const modifierFun of modifier.fun) {
                    if (acc.indexOf(modifierFun) < 0) {
                        acc.push(modifierFun);
                    }
                }
            }
        }

        return acc;
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
            throw new Error("State should be initialized");
        }

        const cons = typeof obj === "function" ? obj : obj.constructor;

        if (cons[STATE_META]) {
            return cons[STATE_META];
        }

        const stateMeta: StateMeta<TState> = { stateConstructor: null, inputs: [], outputs: [], modifiers: [], asyncInit: null };

        cons[STATE_META] = stateMeta;

        return stateMeta;
    }

    private static cloneStateObject<TState>(previousState: TState, diff: Partial<TState>, stateMeta: StateMeta<TState>): TState {

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

        if (stateMeta.stateConstructor) {
            const newInstance = Object.create(stateMeta.stateConstructor.prototype);
            Object.assign(newInstance, previousState, diff);
            return newInstance;
        }
        return Object.assign({}, previousState, diff);
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
