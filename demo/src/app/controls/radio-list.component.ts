import { Component, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WithState, IWithState } from "ng-set-state";
import { RadioListState, ItemView } from "./radio-list.state";

@Component({
    selector: 'radio-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./radio-list.component.html",
    inputs: RadioListState.ngInputs,
    outputs: RadioListState.ngOutputs
})
@WithState(RadioListState, RadioListState.ngInputs, RadioListState.ngOutputs)
export class RadioListComponent implements IWithState<RadioListState>{

    public state: RadioListState;

    public ngOnChanges(changes: SimpleChanges): void {}

    public modifyState<TK extends keyof RadioListState>(propName: TK, value: RadioListState[TK]): boolean { return false; } 

    public modifyStateDiff(diff: Partial<RadioListState> | null): boolean { return false; }

    public onRadioChange(item: ItemView): void {
        this.modifyState("selected", item.value);
    }
}
