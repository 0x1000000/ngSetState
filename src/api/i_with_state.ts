import { OnChanges } from "@angular/core";

export interface IWithState<TState> extends OnChanges {

    state: TState;

    modifyState(propName: keyof TState, value: any): boolean;

    modifyStateDiff(diff: Partial<TState>|null): boolean;

    onAfterStateApplied?(previousState?: TState): void;
}