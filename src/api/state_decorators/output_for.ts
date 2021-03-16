import { Functions } from "../../impl/functions";
import { ComponentState } from '../state_tracking';

export function OutputFor<TComponent>(propRef: keyof ComponentState<TComponent>): (c: TComponent, prop: keyof TComponent) => any {

    return (target: TComponent, propertyKey: keyof TComponent) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.emitterMaps[propertyKey as string] != null) {
            throw new Error(`Output for '${propRef}' has been already declared`);
        }
        stateMeta.emitterMaps[propertyKey as string] = propRef;
    }
}

export function IncludeInState<TComponent>(): any {

    return (target: TComponent, propertyKey: keyof TComponent) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.explicitStateProps.indexOf(propertyKey)>=0) {
            throw new Error(`"Property '${propertyKey}' has been already included into the state`);
        }
        stateMeta.explicitStateProps.push(propertyKey);
    }
}

export function BindToShared<TComponent>(sharedProp?: keyof TComponent, index?: number): any {

    return (target: TComponent, propertyKey: keyof TComponent) => {
        if (!sharedProp) {
            sharedProp = propertyKey;
        }

        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.sharedBindings[propertyKey as any] != null) {
            throw new Error(`"Property '${propertyKey}' has been already bound to a shared state propery.`);
        }
        stateMeta.sharedBindings[propertyKey as any] = index == null ? sharedProp : [sharedProp, index];
    }
}