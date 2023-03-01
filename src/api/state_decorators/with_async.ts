import { Constructor, AsyncContext, StateActionBase } from './../../api/common';
import { ComponentState, ComponentStateDiff } from './../../api/state_tracking';
import { ActionModifier, AsyncData, AsyncModifier, ConComponent } from './../../impl/domain';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "../../impl/utils";
import { AsyncState } from "../../impl/async_state";

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

export function WithAsync<TComponent>(...propNames: (keyof S<TComponent>)[]): IWithAsyncAndAllOptions<TComponent>{

    const asyncData: AsyncData = {
        locks: [],
        behaviorOnConcurrentLaunch: "putAfter",
        behaviorOnError: "throw",
        predicate: null,
        finalizer: null
    };

    let debounceMsRef: {value: number| null}  = {value: null};

    const result: IWithAsyncAndAllOptions<TComponent> = <any>
    ((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {

        if (debounceMsRef.value != null) {

            const debounceAsyncData: AsyncData = {
                locks: null,
                behaviorOnConcurrentLaunch: "replace",
                behaviorOnError: "throw",
                predicate: null,
                finalizer: null
            };

            const stateMeta = Functions.ensureStateMeta(target);

            return Functions.addModifier(
                target,
                propertyKey,
                { value: buildDebounceModifierFun<TComponent>(propNames, debounceMsRef.value, stateMeta.emitters, descriptor.value, asyncData) },
                propNames,
                debounceAsyncData, undefined);


        }

        return Functions.addModifier(target, propertyKey, descriptor, propNames, asyncData, undefined);
    });

    Object.assign(result, getAsyncDataBuilder(result, asyncData, debounceMsRef));

    return result;
}

export function WithActionAsync<TComponent, TAction extends StateActionBase>(actionType: Constructor<TAction>): IWithAsyncAndAllOptions<TComponent>{

    const asyncData: AsyncData = {
        locks: [],
        behaviorOnConcurrentLaunch: "putAfter",
        behaviorOnError: "throw",
        predicate: null,
        finalizer: null
    };

    let debounceMsRef: {value: number| null}  = {value: null};

    const result: IWithAsyncAndAllOptions<TComponent> = <any>
    ((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {

        if (debounceMsRef.value != null) {

            const debounceAsyncData: AsyncData = {
                locks: null,
                behaviorOnConcurrentLaunch: "replace",
                behaviorOnError: "throw",
                predicate: null,
                finalizer: null
            };

            return Functions.addActionModifier(
                target,
                propertyKey,
                { value: buildDebounceActionModifierFun<TComponent, TAction>(debounceMsRef.value, descriptor.value) },
                actionType,
                debounceAsyncData);

        }

        return Functions.addActionModifier(target, propertyKey, descriptor, actionType, asyncData);
    });

    Object.assign(result, getAsyncDataBuilder(result, asyncData, debounceMsRef));

    return result;
}

function getAsyncDataBuilder<TComponent>(result: IWithAsyncAndAllOptions<TComponent>, asyncData: AsyncData, debounceMsRef: {value: number| null}): IWithAsyncAllOptions<TComponent> {

    const checks: Checks = { onConcurrent: false, locks: false, onError: false, if: false, finally: false };

    const checkGeneric = (prop: keyof Checks, name: string) => {
        if (checks[prop]) {
            throw new Error(`function ${name}() has been called several times`);
        } else {
            checks[prop] = true;
        }
    };

    const checkOnConcurrent = () => checkGeneric("onConcurrent", "OnConcurrent...");
    const checkLocks = () => checkGeneric("locks", "Locks");
    const checkOnError = () => checkGeneric("onError", "OnError...");

    return {
        OnConcurrentLaunchCancel: () => {
            checkOnConcurrent();
            asyncData.behaviorOnConcurrentLaunch = "cancel";
            return result;
        },
        OnConcurrentLaunchPutAfter: () => {
            checkOnConcurrent();
            asyncData.behaviorOnConcurrentLaunch = "putAfter";
            return result;
        },
        OnConcurrentLaunchReplace: () => {
            checkOnConcurrent();
            asyncData.behaviorOnConcurrentLaunch = "replace";
            return result;
        },
        OnConcurrentLaunchConcurrent: () => {
            checkOnConcurrent();
            asyncData.behaviorOnConcurrentLaunch = "concurrent";
            return result;
        },
        Locks: (...lockIds: string[]) => {
            checkLocks();
            asyncData.locks = lockIds;
            return result;
        },
        OnErrorThrow: () => {
            checkOnError();
            asyncData.behaviorOnError = "throw";
            return result;
        },
        OnErrorForget: () => {
            checkOnError();
            asyncData.behaviorOnError = "forget";
            return result;
        },
        OnErrorCall: (method: (currenTComponent: TComponent, error: any) => Partial<TComponent> | null) => {
            checkOnError();
            asyncData.behaviorOnError = { callMethod: method };
            return result;
        },
        Debounce: (inDebounceMs: number) => {

            if (debounceMsRef.value != null) {
                throw new Error("function Debounce(...) has been called several times");
            }
            if(inDebounceMs == null || inDebounceMs <= 0){
                throw new Error("Debounce time should be greater than zero");
            }
            debounceMsRef.value = inDebounceMs;
            return result;
        },
        If: (predicate: (currenTComponent: TComponent) => boolean) => {
            checkGeneric("if", "If");
            asyncData.predicate = predicate;
            return result;
        },
        Finally: (method: () => Partial<TComponent> | null) => {
            checkGeneric("finally", "Finally");
            asyncData.finalizer = method;
            return result;
        }
    }    
}

type Checks = { onConcurrent: boolean, locks: boolean, onError: boolean, if: boolean, finally: boolean };

export type IWithAsyncAllOptions<TComponent> = IWithAsyncOnConcurrentLaunch<TComponent> & IWithAsyncLocks<TComponent> & IWithAsyncOnError<TComponent> & IWithAsyncTimeFunctions<TComponent> & IWithAsyncPrePostFunctions<TComponent>;

export type IWithAsyncAndAllOptions<TComponent> = IWithAsync<TComponent> & IWithAsyncAllOptions<TComponent>;

export interface IWithAsyncOnConcurrentLaunch<TComponent> {
    OnConcurrentLaunchCancel(): IWithAsyncAndAllOptions<TComponent>;
    OnConcurrentLaunchPutAfter(): IWithAsyncAndAllOptions<TComponent>;
    OnConcurrentLaunchReplace(): IWithAsyncAndAllOptions<TComponent>;
    OnConcurrentLaunchConcurrent(): IWithAsyncAndAllOptions<TComponent>;
}

export interface IWithAsyncLocks<TComponent> {
    Locks(...lockIds: string[]): IWithAsyncAndAllOptions<TComponent>;
}

export interface IWithAsyncOnError<TComponent> {
    OnErrorThrow(): IWithAsyncAndAllOptions<TComponent>;
    OnErrorForget(): IWithAsyncAndAllOptions<TComponent>;
    OnErrorCall(method: (currenTComponent: TComponent, error: any)=> Partial<TComponent>|null): IWithAsyncAndAllOptions<TComponent>;
}

export interface IWithAsyncTimeFunctions<TComponent> {
    Debounce(timeMs: number): IWithAsyncAndAllOptions<TComponent>;
}

export interface IWithAsyncPrePostFunctions<TComponent> {
    If(predicate: (currenTComponent: TComponent) => boolean): IWithAsyncAndAllOptions<TComponent>;
    Finally(method: () => Partial<TComponent> | null): IWithAsyncAndAllOptions<TComponent>;
}


export interface IWithAsync<TComponent> {
    (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor);
}


function buildDebounceModifierFun<TComponent>(propNames: (keyof S<TComponent>)[], debounceMs: number, emitters: (keyof S<TComponent>)[], fun: AsyncModifier<TComponent>, asyncData: AsyncData) {

    async function debounceModifierFun(asyncContext: AsyncContext<TComponent> & ConComponent<TComponent>, originalState: S<TComponent>, diff: SD<TComponent>): Promise<SD<TComponent> | null> {

        await delayMs(debounceMs);

        if (!asyncContext.isCancelled()) {
            const currentState = asyncContext();

            const runAlways = emitters.length > 0 && propNames.some(p => emitters.indexOf(p) >= 0);

            if (runAlways || !cmpByPropsAll(originalState, currentState, propNames)) {

                fun.asyncData = asyncData;

                AsyncState.pushModifiers<any>(asyncContext.getComponent(), [fun], originalState, diff);
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
            return fun.apply(currentState, [action, currentState]);
        }
        return null;
    }

    return debounceModifierFun;
}
