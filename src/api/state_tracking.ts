import { Constructor, EventEmitterLike, ObservableLike, StateActionBase, SubjectLike } from './common';
import { Functions } from '../impl/functions';
import { StateTrackerContext } from "../impl/state_tracking_context";

type PropOnlyKey<T> = { [K in keyof T]: T[K] extends (Function|IStateHandler<any>) ? never : K }[keyof T];
type PropOnly<T> = Pick<T, PropOnlyKey<T>>;

type NoPureObservableProp<T> = { [K in keyof T]:T[K] extends (Function|IStateHandler<any>) 
                                                ? never : 
                                                (T[K] extends ObservableLike<unknown> 
                                                    ? (T[K] extends (SubjectLike<unknown> | EventEmitterLike<unknown>)
                                                        ? K
                                                        : never) 
                                                    : K) }[keyof T];
type NoPureObservables<T> = Pick<T, NoPureObservableProp<T>>;

type UnwrapObservables<T> = { [K in keyof T]: T[K] extends ObservableLike<infer OT> ? (OT | undefined) : T[K] }

export type ComponentState<T> = Readonly<UnwrapObservables<PropOnly<T>>>;
export type ComponentStateDiff<T> = Partial<UnwrapObservables<NoPureObservables<T>>> | null;
export type StateDiff<T> = ComponentStateDiff<T> 
    | [NonNullable<ComponentStateDiff<T>>, StateActionBase,...StateActionBase[]]
    | [StateActionBase,...StateActionBase[]];

export type StateTrackingOptions<TComponent> = {
    immediateEvaluation?: boolean | null,
    includeAllPredefinedFields?: boolean | null,
    onStateApplied?: ((component: TComponent, state: ComponentState<TComponent>, previousState: ComponentState<TComponent>) => void) | null,
    getInitialState?: ((component: TComponent) => ComponentStateDiff<TComponent> | null) | null,
    setHandler?: ((component: TComponent, handler: IStateHandler<TComponent>) => void) | null,
    getSharedStateTracker?: ((component: TComponent) => Object | Object[] | null) | null,
    errorHandler?: ((e: Error) => boolean) | null;
}

export type InitStateTrackingOptions<TComponent> = {
    immediateEvaluation?: boolean | null,
    includeAllPredefinedFields?: boolean | null,
    onStateApplied?: ((state: ComponentState<TComponent>, previousState: ComponentState<TComponent>) => void) | null,
    initialState?: ComponentStateDiff<TComponent> | null,
    sharedStateTracker?: Object | Object[] | null,
    errorHandler?: ((e: Error) => boolean) | null
}

export interface IStateHandler<TComponent> {

    getState(): ComponentState<TComponent>;

    modifyStateDiff(diff: StateDiff<TComponent>);

    subscribeSharedStateChange(): ISharedStateChangeSubscription | null;

    whenAll(): Promise<any>;

    execAction<TAction extends StateActionBase>(action: TAction|TAction[]): boolean;

    release();
}

export interface ISharedStateChangeSubscription {
    unsubscribe();
}

export function initializeImmediateStateTracking<TComponent extends Object>(component: TComponent, options?: Omit<InitStateTrackingOptions<TComponent>, 'immediateEvaluation'>): IStateHandler<TComponent> {

    const o: InitStateTrackingOptions<TComponent> = {};

    Object.assign(o, options);
    o.immediateEvaluation = true;
    if (o.includeAllPredefinedFields == null) {
        o.includeAllPredefinedFields = true;
    }

    return initializeStateTracking(component, o);
}

export function initializeStateTracking<TComponent extends Object>(component: TComponent, options?: InitStateTrackingOptions<TComponent>): IStateHandler<TComponent> {

    const target = (<any>component)?.constructor;

    if (target == null) {
        throw new Error(`"initializeStateTracking" can be used only with classes`);
    }

    const stateMeta = Functions.ensureStateMeta(target);

    let contextOptions: Required<StateTrackingOptions<TComponent>> | null = null;
    if (options != null) {

        contextOptions = {
            immediateEvaluation: options.immediateEvaluation ?? null,
            includeAllPredefinedFields: options.includeAllPredefinedFields ?? null,
            onStateApplied: options.onStateApplied ? ((_, s, p) => options.onStateApplied?.call(component, s, p)) : null,
            getInitialState: (options.initialState != null ? (() => options.initialState) : null) as any,
            setHandler: null,
            getSharedStateTracker: (options.sharedStateTracker != null ? (() => options.sharedStateTracker) : null) as any,
            errorHandler: options.errorHandler ?? null
        };
    }

    new StateTrackerContext<TComponent>(component, stateMeta, contextOptions);

    const handler = StateTrackerContext.tryGetStateHandler(component);
    if (handler == null) {
        throw new Error('Could not find state handler')
    }    
    return handler;
}

export function releaseStateTracking(component: any) {
    StateTrackerContext.releaseComponent(component);
}

export function StateTracking<TComponent extends Object>(options?: StateTrackingOptions<TComponent>)
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
