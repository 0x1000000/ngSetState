import { Modifier } from './../../impl/domain';
import { Functions } from './../../impl/functions';

export function Calc<TState, Prop extends keyof TState>(propNames: (keyof TState)[], func: (currentSate: TState, previousSate: TState, diff: Partial<TState>) => TState[Prop]): any {
    return (target: TState, propertyKey: Prop) => {
        const stateMeta = Functions.ensureStateMeta(target);

        const modifier: Modifier<TState> = (currentSate: TState, previousSate: TState, diff: Partial<TState>) => {
            const res: Partial<TState> = {};
            res[propertyKey] = func(currentSate, previousSate, diff);
            return res;
        };
        for (const propName of propNames) {

            let detect = false;
            for (const m of stateMeta.modifiers) {

                if (m.prop === propName) {
                    m.fun.push(modifier);
                    detect = true;
                }
            }

            if (!detect) {
                stateMeta.modifiers.push({ prop: propName, fun: [modifier] });
            }
        }
    };
}