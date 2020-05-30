import { Functions } from '../../impl/functions';

export function Emitter<TState>(): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.emitters.findIndex(i => i === propertyKey) >= 0) {
            throw new Error(`Event with name '${propertyKey}' has been already declared`);
        }

        stateMeta.emitters.push(propertyKey);
    };
}