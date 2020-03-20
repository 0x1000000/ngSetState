import { Component, HostListener, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoNewItemState } from './todoNewItem.state';

@Component({
    selector: 'todo-new-item',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './todoNewItem.component.html',
    inputs: TodoNewItemState.ngInputs,
    outputs: TodoNewItemState.ngOutputs
})
export class TodoNewItemComponent extends WithStateBase<TodoNewItemState> implements OnChanges {

    constructor() {
        super(new TodoNewItemState(), TodoNewItemState.ngInputs, TodoNewItemState.ngOutputs);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    @HostListener("click")
    public onHostClick() {
        this.modifyStateDiff(this.state.withEditMode());
    }

    public onEditBlur() {
        this.modifyStateDiff(this.state.withEditEnd());
    }

    public onInputInit(input: HTMLInputElement) {
        input.focus();
    }

    public onInputKeyDown(ke: KeyboardEvent) {
        if (ke.keyCode === 13) {
            this.modifyStateDiff(this.state.withEditEnd());
        }
    }

    public isViewMode() {
        return this.state.mode === "view";
    }

    public isEditMode() {
        return this.state.mode === "edit";
    }
}
