import { Component, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CalculatorDemoState } from "./calculator-demo.state";
import { WithStateBase } from 'ng-set-state';
import { StateStorageService } from "../StateStorageService";

@Component({
    selector: 'calculator-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator-demo.component.html",
})
export class CalculatorDemoComponent extends WithStateBase<CalculatorDemoState> implements OnChanges {

    private static readonly stateStorageKey = "calculatorDemo";

    constructor(private readonly _stateStorage: StateStorageService) {
        super(_stateStorage.getState(CalculatorDemoComponent.stateStorageKey, () => new CalculatorDemoState()), [], []);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public onAfterStateApplied(): void {
        this._stateStorage.setState(CalculatorDemoComponent.stateStorageKey, this.state);
    }

    public result1: number;

    public result2: number;
}
