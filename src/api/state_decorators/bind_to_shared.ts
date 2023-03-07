import { Constructor } from "./../../api/common";
import { ComponentState } from "./../../api/state_tracking";
import { Functions } from "../../impl/functions";

export function BindToShared<TComponent>(sharedProp?: keyof TComponent, index?: number): any;

export function BindToShared<TComponent, TShared>(type: Constructor<TShared>, sharedProp: keyof ComponentState<TShared>, index?: number): any;

export function BindToShared<TComponent>(...args: any[]): any {

    let sharedType: Constructor<any>;
    let sharedProp: keyof ComponentState<any>;
    let index: number;

    if(args.length > 0 && typeof args[0] === 'function') {
        [sharedType, sharedProp, index] = args;
    } else {
        [sharedProp, index] = args;
    }

    return (target: TComponent, propertyKey: keyof TComponent) => {
        if (!sharedProp) {
            sharedProp = propertyKey as any;
        }

        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.sharedBindings[propertyKey as any] != null) {
            throw new Error(`"Property '${propertyKey?.toString()}' has been already bound to a shared state property.`);
        }
        stateMeta.sharedBindings[propertyKey as any] = {
            sharedProp,
            sharedType,
            index
        };
    }
}