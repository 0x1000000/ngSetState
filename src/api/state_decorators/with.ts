import { Constructor, AsyncContext, StateActionBase } from './../../api/common';
import { ComponentState, ComponentStateDiff } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "./../../impl/utils";
import { AsyncData, Modifier, ActionModifier } from './../../impl/domain';

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

type Parameters = {
    debounceMs?: number,
    callOnInit?: boolean,
    if?: (s: any) => boolean,
    notEqualNull?: boolean
};

export function With<TComponent>(...propNames: (keyof S<TComponent>)[]): IWithParams<TComponent> {

    const parameters: Parameters = {};

    const result: IWithParams<TComponent> =
        <any>((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {

            if (parameters.debounceMs && parameters.debounceMs > 0) {

                const asyncData: AsyncData = {
                    locks: null,
                    behaviorOnConcurrentLaunch: "replace",
                    behaviorOnError: "throw",
                    predicate: buildPredicate(propNames, parameters.notEqualNull ?? false, parameters.if),
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
                return Functions.addModifier(target, propertyKey, descriptor, propNames, null, {
                    callOnInit: parameters.callOnInit, 
                    if: buildPredicate(propNames, parameters.notEqualNull ?? false, parameters.if)
                });
            }
        });

    Object.assign(result, getWithTimeFunctionsImpl(result, parameters));

    Object.assign(result, {
        CallOnInit: () => {
            checkParameterIsNotSet<Parameters, IWithParams<any>>(parameters, 'callOnInit', 'CallOnInit');
            parameters.callOnInit = true;
            return result;
        },
        If: (predicate: (state: TComponent) => boolean) => {
            checkParameterIsNotSet<Parameters, IWithParams<any>>(parameters, 'if', 'If');
            parameters.if = predicate;
            return result;
        },
        IfNotEqualNull: () => {
            checkParameterIsNotSet<Parameters, IWithParams<any>>(parameters, 'notEqualNull', 'IfNotEqualNull');
            parameters.notEqualNull = true;
            return result;
        }

    } satisfies Omit<IWithParams<TComponent>, 'Debounce'>);

    return result;
}

export function WithAction<TComponent, TAction extends StateActionBase>(actionType: Constructor<TAction>): IWithActionParams<TComponent> {

    const parameters: any = {};

    const result: IWithActionParams<TComponent> =
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

export interface IMethodDecorator<TComponent> {
    (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor);
}

export interface IWithParams<TComponent> extends IMethodDecorator<TComponent> {
    Debounce(timeMs: number): IWithParams<TComponent>;
    CallOnInit(): IWithParams<TComponent>;
    If(predicate: (state: TComponent) => boolean): IWithParams<TComponent>;
    IfNotEqualNull(): IWithParams<TComponent>;
}

export interface IWithActionParams<TComponent> extends IMethodDecorator<TComponent> {
    Debounce(timeMs: number): IMethodDecorator<TComponent>;
}

function getWithTimeFunctionsImpl<TRes extends { Debounce: (ms: number)=> any }>(result: TRes, parameters: Parameters): { Debounce: (ms: number)=>any } {
    return {
        Debounce(debounceMs: number): TRes {
            checkParameterIsNotSet<Parameters, TRes>(parameters, 'debounceMs', 'Debounce');
            
            if(debounceMs == null || debounceMs <= 0){
                throw new Error("Debounce time should be greater than zero");
            }            
            parameters.debounceMs = debounceMs;
            return result;
        }
    };
}

function buildPredicate<TComponent>(propNames: (keyof S<TComponent>)[], notNull: boolean, predicate: ((s: any) => boolean) | undefined): ((s: any) => boolean) | undefined {
    if (!notNull && predicate == null) {
        return undefined;
    }
    return (state: any) => {
        if(state == null) {
            return false;
        }
        if(predicate != null && !predicate(state)) {
            return false;
        }
        if(notNull && propNames != null) {
            for(const p of propNames) {
                if(state[p] == null) {
                    return false;
                }
            }
        }
        return true;
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

function checkParameterIsNotSet<T, TI>(p: T, k: keyof T, paramName: keyof TI) {
    if(p?.[k] !== undefined) {
        throw new Error(`function ${paramName?.toString()}() has been called several times`);
    }
}