import { Constructor } from './../../api/common';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "./../../impl/utils";
import { AsyncData } from './../../impl/domain';

export function With<TState>(...propNames: (keyof TState)[]):IWithAndAllOptions<TState> {

    const parameters: any = {};

    const result: IWithAndAllOptions<TState> =
        <any>((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {

            if (parameters.debounceMs && parameters.debounceMs > 0) {

                const asyncData: AsyncData = {
                    locks: null,
                    behaviourOnConcurrentLaunch: "replace",
                    behaviourOnError: "throw"
                };

                return Functions.addModifier(
                    target,
                    propertyKey,
                    { value: buildDebounceModifierFun<TState>(propNames, parameters.debounceMs, descriptor.value) },
                    propNames,
                    asyncData);
            } else {
                return Functions.addModifier(target, propertyKey, descriptor, propNames, null);
            }
        });

    const extra: IWithTimeFunctions<TState> = {
        Debounce(debounceMs: number): IWithAndAllOptions<TState> {
            parameters.debounceMs = debounceMs;
            return result;
        }
    }

    Object.assign(result, extra);

    return result;
}

export interface IWith<TState> {
    (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor);
}

export type IWithAllOptions<TState> = IWithTimeFunctions<TState>;

export type IWithAndAllOptions<TState> = IWith<TState> & IWithAllOptions<TState>;

export interface IWithTimeFunctions<TState> {
    Debounce(timeMs: number): IWithAndAllOptions<TState>;
}


function buildDebounceModifierFun<TState>(propNames: (keyof TState)[], debounceMs: number, fun: (currentState: TState)=> Partial<TState>) {

    async function debounceModifierFun<TState>(getState: () => TState, originalState: TState): Promise<Partial<TState> | null> {

        await delayMs(debounceMs);

        const currentState = getState();

        if (!cmpByPropsAll(originalState, currentState, propNames as string[])) {
            return fun.apply(currentState, [currentState, originalState]);
        }
        return null;
    }

    return debounceModifierFun;
}

