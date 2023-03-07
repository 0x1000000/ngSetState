import { ComponentState, ComponentStateDiff, ISharedStateChangeSubscription, StateDiff } from "./state_tracking";

export interface IWithState<TComponent> extends IStateHolder<TComponent> {
    modifyState<TK extends keyof NonNullable<ComponentStateDiff<TComponent>>>(propName: TK, value: NonNullable<ComponentStateDiff<TComponent>>[TK]): boolean;

    onAfterStateApplied?(previousState?: ComponentState<TComponent>): void;

    subscribeSharedStateChange(): ISharedStateChangeSubscription | null;

    whenAll(): Promise<any>;

    release(): void;
}

export interface IStateHolder<TComponent> {

    state: ComponentState<TComponent>;

    modifyStateDiff(diff: StateDiff<TComponent>): boolean;

    errorHandler?: (e:Error) => boolean;
}
