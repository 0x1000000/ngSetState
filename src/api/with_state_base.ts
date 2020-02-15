import { SimpleChanges } from '@angular/core';
import { IWithState } from './i_with_state';
import { Constructor } from './common';
import { AsyncState } from './../impl/async_state';
import { StateMeta } from './../impl/domain';
import { Functions } from './../impl/functions';

export abstract class WithStateBase<TState extends Object> implements IWithState<TState> {

    constructor(initialState: TState, ngInputs: string[] | null, ngOutputs: string[] | null) {
        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(initialState);
        stateMeta.stateConstructor = <Constructor<TState>>initialState.constructor;
        Functions.initialize(this, initialState, ngInputs, ngOutputs);

        this.state = initialState;
    }

    public state: TState;

    public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): boolean {
        return Functions.modifyState(this, propName, value);
    }

    public modifyStateDiff(diff: Partial<TState> | null): boolean {
        return Functions.nextState(this, diff);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        Functions.ngOnChanges(this, changes);
    }    

    public whenAll(): Promise<any> {
        return AsyncState.whenAll(this);
    }
}