import { Constructor } from './../../api/common';
import { AsyncData } from './../../impl/domain';
import { Functions } from './../../impl/functions';

export function WithAsync<TState>(...propNames: (keyof TState)[]): IWithAsyncAndAllOptions<TState>{

    const asyncData: AsyncData = {
        locks: [],
        behaviourOnConcurrentLaunch: "putAfter",
        behaviourOnError: "throw",
    };

    const result: IWithAsyncAndAllOptions<TState> = <any>
        ((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
            return Functions.addModifier(target, propertyKey, descriptor, propNames, asyncData);
        });

    const checks: { onConcurrent: boolean, locks: boolean, onError: boolean } = {onConcurrent: false, locks: false, onError: false};

    const checkOnConcurrent = () => {
        if (checks.onConcurrent) {
            throw new Error("function OnConcurrent...() has been called several times");
        } else {
            checks.onConcurrent = true;
        }
    };
    const checkLocks = () => {
        if (checks.locks) {
            throw new Error("function Locks() has been called several times");
        } else {
            checks.locks = true;
        }
    };
    const checkOnError = () => {
        if (checks.onError) {
            throw new Error("function OnError...() has been called several times");
        } else {
            checks.locks = true;
        }
    };

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
        }
    }

    Object.assign(result, optional);

    return result;
}

export type IWithAsyncAllOptions<TState> = IWithAsyncOnConcurrentLaunch<TState> & IWithAsyncLocks<TState> & IWithAsyncOnError<TState>;

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

export interface IWithAsync<TState> {
    (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor);
}
