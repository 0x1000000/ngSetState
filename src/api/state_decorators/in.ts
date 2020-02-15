import { Functions } from './../../impl/functions';

export function In<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.inputs.findIndex(i=>i.stateProp === propertyKey) >= 0) {
            throw new Error(`Input with name '${propertyKey}' has been already declared`);
        }

        stateMeta.inputs.push({ stateProp: propertyKey, componentProp: componentProp ? componentProp  : (propertyKey as string) });
    };
}