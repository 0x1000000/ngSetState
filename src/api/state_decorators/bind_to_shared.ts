import { Functions } from "../../impl/functions";

export function BindToShared<TComponent>(sharedProp?: keyof TComponent, index?: number): any {

    return (target: TComponent, propertyKey: keyof TComponent) => {
        if (!sharedProp) {
            sharedProp = propertyKey;
        }

        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.sharedBindings[propertyKey as any] != null) {
            throw new Error(`"Property '${propertyKey?.toString()}' has been already bound to a shared state propery.`);
        }
        stateMeta.sharedBindings[propertyKey as any] = index == null ? sharedProp : [sharedProp, index];
    }
}