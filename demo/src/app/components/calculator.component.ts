import { Component, ChangeDetectionStrategy } from '@angular/core';
import { WithStateBase } from "../ngSetState";
import { CalculatorState } from "./calculator.state";


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
