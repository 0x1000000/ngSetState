import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoItemState } from './todoItem.state';

@Component({
    selector: 'todo-item',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './todoItem.component.html',
    inputs: TodoItemState.ngInputs,
    outputs: TodoItemState.ngOutputs
})
export class TodoItemComponent extends WithStateBase<TodoItemState> {

    constructor() {
        super(new TodoItemState(), TodoItemState.ngInputs, TodoItemState.ngOutputs);
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

    public onCompleteClick(ev: Event) {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
    }

    public onDeleteClick(ev: Event) {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
        this.modifyState("isDeleted", true);
    }

    public isViewMode() {
        return this.state.mode === "view";
    }

    public isEditMode() {
        return this.state.mode === "edit";
    }
}
