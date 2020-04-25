import { Constructor, AsyncContext } from './../../api/common';
import { AsyncData, AsyncModifier, ConComponent } from './../../impl/domain';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "../../impl/utils";
import { AsyncState } from "../../impl/async_state";

export function WithAsync<TState>(...propNames: (keyof TState)[]): IWithAsyncAndAllOptions<TState>{

    const asyncData: AsyncData = {
        locks: [],
        behaviourOnConcurrentLaunch: "putAfter",
        behaviourOnError: "throw",
        predicate: null,
        finalizer: null
    };

    let debounceMs: number | null = null;

    const result: IWithAsyncAndAllOptions<TState> = <any>
    ((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {

        if (debounceMs != null) {

            const debounceAsyncData: AsyncData = {
                locks: null,
                behaviourOnConcurrentLaunch: "replace",
                behaviourOnError: "throw",
                predicate: null,
                finalizer: null
            };

            return Functions.addModifier(
                target,
                propertyKey,
                { value: buildDebounceModifierFun<TState>(propNames, debounceMs, descriptor.value, asyncData) },
                propNames,
                debounceAsyncData);


        }

        return Functions.addModifier(target, propertyKey, descriptor, propNames, asyncData);
    });

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

    const optional: IWithAsyncAllOptions<TState> = {
        OnConcurrentLaunchCancel: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "cancel";
            return result;
        },
        OnConcurrentLaunchPutAfter: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "putAfter";
            return result;
        },
        OnConcurrentLaunchReplace: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "replace";
            return result;
        },
        OnConcurrentLaunchConcurrent: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "concurrent";
            return result;
        },
        Locks: (...lockIds: string[]) => {
            checkLocks();
            asyncData.locks = lockIds;
            return result;
        },
        OnErrorThrow: () => {
            checkOnError();
            asyncData.behaviourOnError = "throw";
            return result;
        },
        OnErrorForget: () => {
            checkOnError();
            asyncData.behaviourOnError = "forget";
            return result;
        },
        OnErrorCall: (method: (currentState: TState, error: any) => Partial<TState> | null) => {
            checkOnError();
            asyncData.behaviourOnError = { callMethod: method };
            return result;
        },
        Debounce: (inDebounceMs: number) => {

            if (debounceMs != null) {
                throw new Error("function Debounce(...) has been called several times");
            }
            if(inDebounceMs == null || inDebounceMs <= 0){
                throw new Error("Debounce time should be greater than zero");
            }
            debounceMs = inDebounceMs;
            return result;
        },
        If: (predicate: (currentState: TState) => boolean) => {
            checkGeneric("if", "If");
            asyncData.predicate = predicate;
            return result;
        },
        Finally: (method: () => Partial<TState> | null) => {
            checkGeneric("finally", "Finally");
            asyncData.finalizer = method;
            return result;
        }
    }

    Object.assign(result, optional);

    return result;
}

type Checks = { onConcurrent: boolean, locks: boolean, onError: boolean, if: boolean, finally: boolean };

export type IWithAsyncAllOptions<TState> = IWithAsyncOnConcurrentLaunch<TState> & IWithAsyncLocks<TState> & IWithAsyncOnError<TState> & IWithAsyncTimeFunctions<TState> & IWithAsyncPrePostFunctions<TState>;

export type IWithAsyncAndAllOptions<TState> = IWithAsync<TState> & IWithAsyncAllOptions<TState>;

export interface IWithAsyncOnConcurrentLaunch<TState> {
    OnConcurrentLaunchCancel(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchPutAfter(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchReplace(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchConcurrent(): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncLocks<TState> {
    Locks(...lockIds: string[]): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncOnError<TState> {
    OnErrorThrow(): IWithAsyncAndAllOptions<TState>;
    OnErrorForget(): IWithAsyncAndAllOptions<TState>;
    OnErrorCall(method: (currentState: TState, error: any)=> Partial<TState>|null): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncTimeFunctions<TState> {
    Debounce(timeMs: number): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncPrePostFunctions<TState> {
    If(predicate: (currentState: TState) => boolean): IWithAsyncAndAllOptions<TState>;
    Finally(method: () => Partial<TState> | null): IWithAsyncAndAllOptions<TState>;
}


export interface IWithAsync<TState> {
    (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor);
}


function buildDebounceModifierFun<TState>(propNames: (keyof TState)[], debounceMs: number, fun: AsyncModifier<TState>, asyncData: AsyncData) {

    async function debounceModifierFun<TState>(getState: AsyncContext<TState> & ConComponent<TState>, originalState: TState, diff: Partial<TState>): Promise<Partial<TState> | null> {

        await delayMs(debounceMs);

        if (!getState.isCancelled()) {
            const currentState = getState();
            if (!cmpByPropsAll(originalState, currentState, propNames as string[])) {

                fun.asyncData = asyncData;

                AsyncState.pushModifiers<any>(getState.getComponent(), [fun], originalState, diff);
            }
        }
        return null;
    }

    return debounceModifierFun;
}