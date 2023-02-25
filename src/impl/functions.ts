import { Constructor, Constructor as IConstructor } from './../api/common';
import { StateMeta, AsyncModifier, Modifier, isAsyncModifier, STATE_META, AsyncData} from './domain';
import { checkPromise, cmpByProp } from './utils';
import { ComponentState, ComponentStateDiff, initializeStateTracking, InitStateTrackingOptions } from './../api/state_tracking';
import { IWithState } from './../api/i_with_state';

export class Functions {

    public static addSharedModifier<TComponent>(toShared: boolean, sharedType: Constructor<any>, target: Constructor<TComponent>|TComponent, propertyKey: string, descriptor: PropertyDescriptor, propNames: (keyof any)[]) {
        if (sharedType == null) {
            throw new Error(`Shared type should be specified for '${propertyKey}' in. Make sure it is defined before it is used`);
        }
        const stateMeta = Functions.ensureStateMeta(target);
        let modifier: Modifier<any> = descriptor.value;

        const array = toShared ? stateMeta.sharedTargetMappers : stateMeta.sharedSourceMappers;
    
        for (const propName of propNames) {
            let detect = false;
            for (const m of array) {    
                if (m.prop === propName && m.sharedType === sharedType) {
                    if (m.fun.indexOf(modifier)>=0) {
                        throw new Error(`Modifier for shared type '${sharedType}' with name '${propertyKey}' has been already declared`);
                    }
                    m.fun.push(modifier);
                    detect = true;
                }
            }
    
            if (!detect) {
                array.push({ prop: propName as any, sharedType: sharedType ,fun: [modifier] });
            }
        }    
    }
  
    public static addModifier<TComponent>(target: Constructor<TComponent>|TComponent, propertyKey: string, descriptor: PropertyDescriptor, propNames: (keyof ComponentState<TComponent>)[], asyncData: AsyncData | null) {
        const stateMeta = Functions.ensureStateMeta(target);
        let modifier: Modifier<TComponent> | AsyncModifier<TComponent> = descriptor.value;
    
        if (asyncData) {
            const original = modifier;
            modifier = function (...args: any[]) {
                return original.apply(this, args);
            };
            (<AsyncModifier<TComponent>><any>modifier).asyncData = asyncData;
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

    public static updateCycle<TComponent>(stateMeta: StateMeta<TComponent>, previousState: ComponentState<TComponent>, diff: ComponentStateDiff<TComponent>, freeze: boolean)
        : { newState: ComponentState<TComponent>, asyncModifiers: AsyncModifier<TComponent>[] | null, emitterProps: (keyof ComponentState<TComponent>)[] | null }
    {
        if (diff == null) {
            return { newState: previousState, asyncModifiers: null, emitterProps: null }
        }
        const currentState = Functions.cloneStateObject(previousState, diff, stateMeta, freeze);

        if (currentState === previousState && stateMeta.emitters.length <= 0) {
            return { newState: currentState, asyncModifiers: null, emitterProps: null };
        }

        return Functions.applyModifiersCycle(stateMeta, currentState, previousState, diff, freeze);
    }

    private static applyModifiersCycle<TComponent>(stateMeta: StateMeta<TComponent>, currentState: ComponentState<TComponent>, previousState: ComponentState<TComponent>, diff: NonNullable<ComponentStateDiff<TComponent>>, freeze: boolean)
        : { newState: ComponentState<TComponent>, asyncModifiers: AsyncModifier<TComponent>[] | null, emitterProps: (keyof ComponentState<TComponent>)[] | null }
    {
        let watchDog = 1000;
        let diffKeys = Object.keys(diff) as (keyof ComponentStateDiff<TComponent>)[];
        const originalDiffKeys = diffKeys;
        let modifiers: (Modifier<TComponent> | AsyncModifier<TComponent>)[] = Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, null);

        let asyncModifiers: AsyncModifier<TComponent>[] | null = null;

        const emitterProps: (keyof ComponentState<TComponent>)[] = [];
        addEmitters(diffKeys);

        while (watchDog > 0) {
            if (modifiers.length < 1) {
                return { newState: currentState, asyncModifiers: asyncModifiers, emitterProps};
            }
            const modifiersAcc: Modifier<TComponent>[] = [];
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

                    diffKeys = Object.keys(diff) as (keyof ComponentStateDiff<TComponent>)[];
                    addEmitters(diffKeys);

                    const hasChanges: boolean = diffKeys.some(dk => !cmpByProp(previousState, diff, dk))
                        || Functions.diffHasEmitter(diffKeys, null, stateMeta)
                        //It allows modifiers to rollback the change 
                        || (diffKeys !== originalDiffKeys && diffKeys.some(dk => originalDiffKeys.indexOf(dk)>=0));

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


        function addEmitters(keys: (keyof ComponentState<TComponent>)[]) {
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

    private static findModifiers<TComponent>(stateMeta: StateMeta<TComponent>, newState: ComponentState<TComponent>, previousState: ComponentState<TComponent>, diffKeys: (keyof ComponentState<TComponent>)[], modifiersAcc: Modifier<TComponent>[] | null): (Modifier<TComponent> | AsyncModifier<TComponent>)[] {
        const acc: (Modifier<TComponent> | AsyncModifier<TComponent>)[] = modifiersAcc == null ? [] : modifiersAcc;

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

    public static ensureStateMeta<TComponent>(obj: TComponent | IConstructor<TComponent>): StateMeta<TComponent> {
        if (obj == null) {
            throw new Error("State host should be initialized");
        }

        const cons = typeof obj === "function" ? obj : obj.constructor;

        if (cons[STATE_META]) {
            return cons[STATE_META];
        }

        const stateMeta: StateMeta<TComponent> = {
            inputs: [],
            outputs: [],
            emitters: [],
            emitterMaps: {},
            modifiers: [],
            explicitStateProps: [],
            sharedBindings: {},
            sharedSourceMappers: [],
            sharedTargetMappers: [],
            asyncInit: null
        };

        cons[STATE_META] = stateMeta;

        return stateMeta;
    }

    public static makeWithState<TComponent extends Object>(target: Partial<IWithState<TComponent>>, component: TComponent, options?: Omit<InitStateTrackingOptions<TComponent>, 'onStateApplied'>) {
        const localOptions: InitStateTrackingOptions<TComponent> = Object.assign({}, options);

        if(localOptions.immediateEvaluation == null) {
            localOptions.immediateEvaluation = true;
        }
        if(localOptions.includeAllPredefinedFields == null) {
            localOptions.includeAllPredefinedFields = true;
        }

        localOptions.onStateApplied = stateChangeCallback;

        const handler = initializeStateTracking(component, localOptions);
        Object.defineProperty(target, 'state', {
            get: () => handler.getState()
        });        
        target.modifyStateDiff = (d) => handler.modifyStateDiff(d);
        target.subscribeSharedStateChange = () => handler.subscribeSharedStateChange();
        target.whenAll = () => handler.whenAll();
        target.release = () => handler.release();

        target.modifyState = (propName, value) =>
        {
            let diff: ComponentStateDiff<TComponent> = {};
            diff[propName] = value;
            return handler.modifyStateDiff(diff);    
        };

        function stateChangeCallback(s: ComponentState<TComponent>, p: ComponentState<TComponent>) {
            if(target.onAfterStateApplied != null) {
                target.onAfterStateApplied(p);
            }
        }
    }

    private static cloneStateObject<TComponent>(previousState: ComponentState<TComponent>, diff: ComponentStateDiff<TComponent>, stateMeta: StateMeta<TComponent>, freeze: boolean): ComponentState<TComponent> {

        //Check changes
        if (diff == null) {
            return previousState;
        }
        const diffProperties = Object.keys(diff);
        if (diffProperties == null || diffProperties.length < 0) {
            return previousState;
        }
        if (diffProperties.every(dp => cmpByProp(previousState, diff, dp as any))) {
            return previousState;
        }
        let result: ComponentState<TComponent>;

        result = Object.assign({}, previousState, diff);

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
