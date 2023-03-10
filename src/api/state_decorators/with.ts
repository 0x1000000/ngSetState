import { Constructor, AsyncContext, StateActionBase } from './../../api/common';
import { ComponentState, ComponentStateDiff } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "./../../impl/utils";
import { AsyncData, Modifier, ActionModifier } from './../../impl/domain';

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

type Parameters = {
    debounceMs?: number,
    callOnInit?: boolean
};

export function With<TComponent>(...propNames: (keyof S<TComponent>)[]): IWithAndAllOptions<TComponent> & IWithCallOnInit<TComponent> {

    const parameters: Parameters = {};

    const result: IWithAndAllOptions<TComponent> & IWithCallOnInit<TComponent> =
        <any>((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {


            if (parameters.debounceMs && parameters.debounceMs > 0) {

                const asyncData: AsyncData = {
                    locks: null,
                    behaviorOnConcurrentLaunch: "replace",
                    behaviorOnError: "throw",
                    predicate: null,
                    preSet: null,
                    finalizer: null
                };

                const stateMeta = Functions.ensureStateMeta(target);

                return Functions.addModifier(
                    target,
                    propertyKey,
                    { value: buildDebounceModifierFun<TComponent>(propNames, parameters.debounceMs, stateMeta.emitters, descriptor.value) },
                    propNames,
                    asyncData, 
                    undefined);
            } else {
                return Functions.addModifier(target, propertyKey, descriptor, propNames, null, parameters.callOnInit);
            }
        });

    Object.assign(result, getWithTimeFunctionsImpl(result, parameters));

    Object.assign(result, {
        CallOnInit: () => {
            parameters.callOnInit = true;
            return result;
        }

    } satisfies IWithCallOnInit<TComponent>);

    return result;
}


export function WithAction<TComponent, TAction extends StateActionBase>(actionType: Constructor<TAction>): IWithAndAllOptions<TComponent> {

    const parameters: any = {};

    const result: IWithAndAllOptions<TComponent> =
        <any>((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {

            if (parameters.debounceMs && parameters.debounceMs > 0) {

                const asyncData: AsyncData = {
                    locks: null,
                    behaviorOnConcurrentLaunch: "replace",
                    behaviorOnError: "throw",
                    predicate: null,
                    preSet: null,
                    finalizer: null
                };

                return Functions.addActionModifier(
                    target,
                    propertyKey,
                    { value: buildDebounceActionModifierFun<TComponent, TAction>(parameters.debounceMs, descriptor.value) },
                    actionType,
                    asyncData);
            } else {
                return Functions.addActionModifier(
                    target,
                    propertyKey,
                    descriptor,
                    actionType,
                    null);
            }
        });

    Object.assign(result, getWithTimeFunctionsImpl(result, parameters));

    return result;
}

export interface IWith<TComponent> {
    (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor);
}

export type IWithAllOptions<TComponent> = IWithTimeFunctions<TComponent>;

export type IWithAndAllOptions<TComponent> = IWith<TComponent> & IWithAllOptions<TComponent>;

export interface IWithTimeFunctions<TComponent> {
    Debounce(timeMs: number): IWithAndAllOptions<TComponent>;
}

export interface IWithCallOnInit<TComponent> {
    CallOnInit(): IWith<TComponent>;
}

function getWithTimeFunctionsImpl<TComponent>(result: IWithAndAllOptions<TComponent>, parameters: Parameters): IWithTimeFunctions<TComponent> {
    return {
        Debounce(debounceMs: number): IWithAndAllOptions<TComponent> {
            if(debounceMs == null || debounceMs <= 0){
                throw new Error("Debounce time should be greater than zero");
            }            
            parameters.debounceMs = debounceMs;
            return result;
        }
    };
}

function buildDebounceModifierFun<TComponent>(propNames: (keyof S<TComponent>)[], debounceMs: number, emitters: (keyof S<TComponent>)[], fun: Modifier<TComponent>) {

    async function debounceModifierFun(asyncContext: AsyncContext<TComponent>, originalState: S<TComponent>, diff: SD<TComponent>): Promise<SD<TComponent> | null> {

        await delayMs(debounceMs);

        if (!asyncContext.isCancelled()) {
            const currentState = asyncContext();

            const runAlways = emitters.length > 0 && propNames.some(p => emitters.indexOf(p) >= 0);

            if (runAlways || !cmpByPropsAll(originalState, currentState, propNames)) {
                return fun.apply(null, [currentState, originalState, diff]);
            }
        }
        return null;
    }

    return debounceModifierFun;
}

function buildDebounceActionModifierFun<TComponent, TAction extends StateActionBase>(debounceMs: number, fun: ActionModifier<TComponent, TAction>) {

    async function debounceModifierFun(action: TAction, asyncContext: AsyncContext<TComponent>): Promise<SD<TComponent> | null> {

        await delayMs(debounceMs);

        if (!asyncContext.isCancelled()) {
            const currentState = asyncContext();
            return fun.apply(null, [action, currentState]);
        }
        return null;
    }

    return debounceModifierFun;
}
