import { Constructor, AsyncContext } from './../../api/common';
import { ComponentState, ComponentStateDiff } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';
import { delayMs, cmpByPropsAll } from "./../../impl/utils";
import { AsyncData, Modifier } from './../../impl/domain';

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

export function With<TComponent>(...propNames: (keyof S<TComponent>)[]): IWithAndAllOptions<TComponent> {

    const parameters: any = {};

    const result: IWithAndAllOptions<TComponent> =
        <any>((target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {


            if (parameters.debounceMs && parameters.debounceMs > 0) {

                const asyncData: AsyncData = {
                    locks: null,
                    behaviourOnConcurrentLaunch: "replace",
                    behaviourOnError: "throw",
                    predicate: null,
                    finalizer: null
                };

                const stateMeta = Functions.ensureStateMeta(target);

                return Functions.addModifier(
                    target,
                    propertyKey,
                    { value: buildDebounceModifierFun<TComponent>(propNames, parameters.debounceMs, stateMeta.emitters, descriptor.value) },
                    propNames,
                    asyncData);
            } else {
                return Functions.addModifier(target, propertyKey, descriptor, propNames, null);
            }
        });

    const extra: IWithTimeFunctions<TComponent> = {
        Debounce(debounceMs: number): IWithAndAllOptions<TComponent> {
            if(debounceMs == null || debounceMs <= 0){
                throw new Error("Debounce time should be greater than zero");
            }            
            parameters.debounceMs = debounceMs;
            return result;
        }
    }

    Object.assign(result, extra);

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

function buildDebounceModifierFun<TComponent>(propNames: (keyof S<TComponent>)[], debounceMs: number, emitters: (keyof S<TComponent>)[], fun: Modifier<TComponent>) {

    async function debounceModifierFun(asyncContext: AsyncContext<TComponent>, originalState: S<TComponent>, diff: SD<TComponent>): Promise<SD<TComponent> | null> {

        await delayMs(debounceMs);

        if (!asyncContext.isCancelled()) {
            const currentState = asyncContext();

            const runAlways = emitters.length > 0 && propNames.some(p => emitters.indexOf(p) >= 0);

            if (runAlways || !cmpByPropsAll(originalState, currentState, propNames)) {
                return fun.apply(currentState, [currentState, originalState, diff]);
            }
        }
        return null;
    }

    return debounceModifierFun;
}

