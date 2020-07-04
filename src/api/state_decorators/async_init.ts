import { Constructor } from './../../api/common';
import { AsyncData, AsyncModifier } from './../../impl/domain';
import { Functions } from './../../impl/functions';
import { IWithAsync } from './with_async';

export function AsyncInit<TState>(): IWithAsync<TState> & IAsyncInitLocks<TState> {

    const asyncData: AsyncData = {
        locks: [],
        unlockPriority: 0,
        behaviourOnConcurrentLaunch: "concurrent",
        behaviourOnError: "throw",
        finalizer: null,
        predicate: null
    };

    const result: IWithAsync<TState> = ((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {

            const stateMeta = Functions.ensureStateMeta(target);

            let asyncInit: AsyncModifier<TState> = descriptor.value;

            const original = asyncInit;
            asyncInit = function(...args: any[]) {
                return original.apply(this, args);
            } as any;

            (<AsyncModifier<TState>><any>asyncInit).asyncData = asyncData;

            stateMeta.asyncInit = asyncInit;
        }) as any;

    const optional: IAsyncInitLocks<TState> = {
        Locks: (...lockIds: string[]) => {
            asyncData.locks = lockIds;
            return result;
        }
    };
    return Object.assign(result, optional);
}

export interface IAsyncInitLocks<TState> {
    Locks(...lockIds: string[]): IWithAsync<TState>;
}