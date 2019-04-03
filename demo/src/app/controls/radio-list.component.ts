import { Component, ElementRef, SimpleChanges, EventEmitter, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { WithState, IWithState } from "../ngSetState";
import { State, ItemView } from "./radio-list.state";

@WithState(new State({ radioName: "radioSelector" }))
@Component({
    selector: 'radio-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./radio-list.component.html",
    inputs: State.ngInputs,
    outputs: State.ngOutputs
})
export class RadioListComponent implements IWithState<State>{

    constructor(elR: ElementRef) {

    }

    public state: State;

    public ngOnChanges(changes: SimpleChanges): void {}

    public modifyState<TK extends keyof State>(propName: TK, value: State[TK]): void {}

    public onRadioChange(item: ItemView): void {
        this.modifyState("selected", item.value);
    }
}
