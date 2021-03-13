import { OnChanges } from "@angular/core";

export interface IWithState<TState> extends IStateHolder<TState>, OnChanges {
    modifyState(propName: keyof TState, value: any): boolean;

    onAfterStateApplied?(previousState?: TState): void;
}

export interface IStateHolder<TState> {
    state: TState;

    modifyStateDiff(diff: Partial<TState> | null): boolean;
}