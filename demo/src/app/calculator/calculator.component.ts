import { Component, ChangeDetectionStrategy } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { CalculatorState } from "./calculator.state";
import { StateStorageService } from "../StateStorageService";


@Component({
    selector: 'calculator',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator.component.html",
    inputs: CalculatorState.ngInputs,
    outputs: CalculatorState.ngOutputs
})
export class CalculatorComponent extends WithStateBase<CalculatorState> {
    constructor() {
        super(new CalculatorState(), CalculatorState.ngInputs, CalculatorState.ngOutputs);
    }
}
