import { Functions } from './../impl/functions';
import { IWithState } from './i_with_state';
import { ComponentState, ComponentStateDiff, InitStateTrackingOptions, ISharedStateChangeSubscription } from './state_tracking';

export abstract class WithStateBase<TComponent extends Object> implements IWithState<TComponent> {

    constructor(component: TComponent, options?: Omit<InitStateTrackingOptions<TComponent>, 'onStateApplied'>) {
        Functions.makeWithState<TComponent>(this, component, options);
    }

    readonly state: ComponentState<TComponent>;

    readonly modifyStateDiff: (diff: ComponentStateDiff<TComponent>) => boolean;

    readonly modifyState: <TK extends keyof NonNullable<ComponentStateDiff<TComponent>>>(propName: TK, value: NonNullable<ComponentStateDiff<TComponent>>[TK]) => boolean;

    onAfterStateApplied?(previousState?: ComponentState<TComponent>): void;

    readonly subscribeSharedStateChange: () => ISharedStateChangeSubscription | null;

    readonly whenAll: () => Promise<any>;

    readonly release: () => void;
}