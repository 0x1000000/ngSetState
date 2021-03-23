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