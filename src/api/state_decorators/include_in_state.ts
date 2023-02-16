import { ComponentState } from "./../../api/state_tracking";
import { Functions } from "../../impl/functions";

export function IncludeInState<TComponent>(): any {

    return (target: TComponent, propertyKey: keyof ComponentState<TComponent>) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.explicitStateProps.indexOf(propertyKey)>=0) {
            throw new Error(`"Property '${propertyKey?.toString()}' has been already included into the state`);
        }
        stateMeta.explicitStateProps.push(propertyKey);
    }
}