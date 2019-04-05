import { Component, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WithState, IWithState } from "../ngSetState";
import { CalculatorState } from "./calculator.state";

@WithState(CalculatorState)
@Component({
    selector: 'calculator',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator.component.html",
    inputs: CalculatorState.ngInputs,
    outputs: CalculatorState.ngOutputs
})
export class CalculatorComponent implements IWithState<CalculatorState> {

    public modifyState<TK extends keyof CalculatorState>(propName: TK, value: CalculatorState[TK]): void { }

    public ngOnChanges(changes: SimpleChanges): void {  }

    public state: CalculatorState;
}
