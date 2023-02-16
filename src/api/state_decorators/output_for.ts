import { Functions } from "../../impl/functions";
import { ComponentState } from '../state_tracking';

export function OutputFor<TComponent>(propRef: keyof ComponentState<TComponent>) {

    return (target: TComponent, propertyKey: string) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.emitterMaps[propertyKey as string] != null) {
            throw new Error(`Output for '${propRef?.toString()}' has been already declared`);
        }
        stateMeta.emitterMaps[propertyKey as string] = propRef;
    }
}