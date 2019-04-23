import { Component } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoItemState } from './todoItem.state';
import { TodoService, TodoItem } from './TodoService';

@Component({
    selector: 'todo-item',
    templateUrl: './todoItem.component.html',
    inputs: TodoItemState.ngInputs,
    outputs: TodoItemState.ngOutputs
})
export class TodoItemComponent extends WithStateBase<TodoItemState> {

    constructor() {
        super(new TodoItemState(), TodoItemState.ngInputs, TodoItemState.ngOutputs);
    }

    public onAfterStateApplied() {
    }    
}
