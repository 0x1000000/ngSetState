import { ComponentState, ComponentStateDiff } from './../../api/state_tracking';
import { Modifier } from './../../impl/domain';
import { Functions } from './../../impl/functions';

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

export function Calc<TComponent, Prop extends keyof NonNullable<SD<TComponent>>>(propNames: (keyof S<TComponent>)[], func: (currentSate: S<TComponent>, previousSate: S<TComponent>, diff: SD<TComponent>) => NonNullable<SD<TComponent>>[Prop]): any {
    return (target: TComponent, propertyKey: Prop) => {
        const stateMeta = Functions.ensureStateMeta(target);

        const modifier: Modifier<TComponent> = (currentSate: S<TComponent>, previousSate: S<TComponent>, diff: SD<TComponent>) => {
            const res: SD<TComponent> = {};
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