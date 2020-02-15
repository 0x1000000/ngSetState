import { Constructor } from './../../api/common';
import { Functions } from './../../impl/functions';

export function With<TState>(...propNames: (keyof TState)[]) {
    return (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
        return Functions.addModifier(target, propertyKey, descriptor, propNames, null);
    };
}