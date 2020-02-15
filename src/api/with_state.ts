import { SimpleChanges } from '@angular/core';
import { IWithState } from './i_with_state';
import { Constructor, NgComponentType } from './common';
import { StateMeta } from './../impl/domain';
import { Functions } from './../impl/functions';

export function WithState<TState>(stateType: Constructor<TState>, ngInputs: string[], ngOutputs: string[], factory?: () => TState): (t: Constructor<any>) => any {

    if (stateType == null) {
        throw new Error("Initial state type should be defined or a factory provided");
    }

    const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(stateType);
    stateMeta.stateConstructor = stateType;

    return (target: NgComponentType) => {
        return class extends target implements IWithState<TState> {

            public state: TState = (() => {

                const initialState = factory != null ? factory() : new stateType();

                Functions.initialize(this, initialState, ngInputs, ngOutputs);

                return initialState;
            })();

            public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): boolean {
                return Functions.modifyState(this, propName, value);
            }

            public modifyStateDiff(diff: Partial<TState> | null): boolean {
                return Functions.nextState(this, diff);
            }

            public ngOnChanges(changes: SimpleChanges): void {

                Functions.ngOnChanges(this, changes);

                if (super.ngOnChanges) {
                    super.ngOnChanges(changes);
                }
            }
        };
    };
}