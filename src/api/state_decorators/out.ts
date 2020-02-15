import { EMITTER_SUFFIX } from './../../impl/domain';
import { Functions } from './../../impl/functions';

export function Out<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.outputs.findIndex(i => i.stateProp === propertyKey) >= 0) {
            throw new Error(`Output with name '${propertyKey}' has been already declared`);
        }

        if (!componentProp) {
            if (typeof propertyKey === "string" &&
            (propertyKey.length < EMITTER_SUFFIX.length || !(propertyKey.indexOf(EMITTER_SUFFIX, propertyKey.length - EMITTER_SUFFIX.length) !== -1))) {
                componentProp = propertyKey + EMITTER_SUFFIX;
            } else {
                componentProp = propertyKey as string;
            }
        }       
        stateMeta.outputs.push({ stateProp: propertyKey, componentProp: componentProp });
    };
}