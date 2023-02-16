import { ComponentState } from './../../api/state_tracking';
import { Functions } from '../../impl/functions';

export function Emitter<TComponent>(): any {
    return (target: TComponent, propertyKey: keyof ComponentState<TComponent>) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.emitters.findIndex(i => i === propertyKey) >= 0) {
            throw new Error(`Event with name '${propertyKey?.toString()}' has been already declared`);
        }

        stateMeta.emitters.push(propertyKey);
    };
}