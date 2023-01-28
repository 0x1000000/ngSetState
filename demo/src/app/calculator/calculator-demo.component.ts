import { Component, ChangeDetectionStrategy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, IStateHandler, StateTracking, With } from 'ng-set-state';
import { StateStorageService } from "../StateStorageService";

type State = ComponentState<CalculatorDemoComponent>;
type NewState = ComponentStateDiff<CalculatorDemoComponent>;

@Component({
    selector: 'calculator-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator-demo.component.html",
})
export class CalculatorDemoComponent {

    private static readonly stateStorageKey = "calculatorDemo";

    constructor(private readonly _stateStorage: StateStorageService, private readonly _cd: ChangeDetectorRef) {
        initializeStateTracking<CalculatorDemoComponent>(this, {
            initialState: this.getInitialState(),
            onStateApplied: (state, previousState) => this.onAfterStateApplied(state, previousState)
        });
    }

    public getInitialState(): State|null{
        return this._stateStorage.getState(CalculatorDemoComponent.stateStorageKey);
    }

    public onAfterStateApplied(state: ComponentState<CalculatorDemoComponent>, previousState: ComponentState<CalculatorDemoComponent>): void {
        this._cd.detectChanges();        
        this._stateStorage.setState(CalculatorDemoComponent.stateStorageKey, state);
    }

    @IncludeInState()
    public arg1: number | null = 0;

    @IncludeInState()
    public arg2: number | null = 0;

    @IncludeInState()
    public operation: "add" | "sub" = "add";

    public result1: number | null = 0;

    public result2: number | null = 0;

    public isCalculating: boolean = false;

    public result1Deb: number | null = 0;

    public result2Deb: number | null = 0;

    @With("result1", "result2")
    public static switchToLoading(state: State): NewState{
        return{
            isCalculating: true
        }
    }

    @With("result1", "result2").Debounce(1000)
    public static delayResult(state: State): NewState{

        return{
            isCalculating: false,
            result1Deb: state.result1,
            result2Deb: state.result2,
        }
    }
}
