import { Constructor } from './common';
import { Functions } from '../impl/functions';
import { StateTrackerContext } from "../impl/state_tracking_context";
import { EventEmitter } from '@angular/core';

type PropOnlKey<T> = { [K in keyof T]: T[K] extends (Function | EventEmitter<any>) ? never : K }[keyof T];
type PropOnly<T> = Pick<T, PropOnlKey<T>>;

export type ComponentState<T> = Readonly<PropOnly<T>>;
export type ComponentStateDiff<T> = Partial<PropOnly<T>> | null;

export type StateTrackingOptions<TComponent> = {
    immediateEvaluation?: boolean | null,
    onStateApplied?: ((component: TComponent, state: ComponentState<TComponent>, previousState: ComponentState<TComponent>) => void) | null,
    getInitialState?: ((component: TComponent) => ComponentStateDiff<TComponent> | null) | null,
    setHandler?: ((component: TComponent, handler: IStateHandler<TComponent>) => void) | null,
    getSharedStateTracker?: ((component: TComponent) => Object | null) | null,
}

export type InitStateTrackingOptions<TComponent> = {
    immediateEvaluation?: boolean | null,
    onStateApplied?: ((state: ComponentState<TComponent>, previousState: ComponentState<TComponent>) => void) | null,
    initialState?: ComponentStateDiff<TComponent> | null,
    sharedStateTracker?: Object | null,
}

export interface IStateHandler<TComponent> {
    getState(): ComponentState<TComponent>;

    modifyStateDiff(diff: ComponentStateDiff<TComponent>);
}

export function initializeStateTracking<TComponent>(component: TComponent, options?: InitStateTrackingOptions<TComponent>): IStateHandler<TComponent> {

    const target = (<any>component)?.constructor;

    if (target == null) {
        throw new Error(`"initializeStateTracking" can be used only with classes`);
    }

    const stateMeta = Functions.ensureStateMeta(target);

    let contextOptions: Required<StateTrackingOptions<TComponent>> | null = null;
    if (options != null) {

        contextOptions = {
            immediateEvaluation: options.immediateEvaluation ?? false,
            onStateApplied: options.onStateApplied ? ((_, s, p) => options.onStateApplied?.call(component, s, p)) : null,
            getInitialState: (options.initialState != null ? (() => options.initialState) : null) as any,
            setHandler: null,
            getSharedStateTracker: (options.sharedStateTracker != null ? (() => options.sharedStateTracker) : null) as any,
        };
    }

    const tracker = new StateTrackerContext<TComponent>(component, stateMeta, contextOptions);
    return { getState: ()=>tracker.getState(), modifyStateDiff: (d)=>tracker.modifyStateDiff(d) };
}

export function StateTracking<TComponent>(options?: StateTrackingOptions<TComponent>)
    : (t: Constructor<TComponent>) => any
{
    return (target: Constructor<any>) => {

        const stateMeta = Functions.ensureStateMeta(target);

        return class StateTracker extends target {

            constructor(...args: any[]) {
                super(...args);

                const componentRef: any = this;

                new StateTrackerContext<TComponent>(componentRef, stateMeta, options);
            }
        }
    }
}