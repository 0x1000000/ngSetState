import { Component } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoItemState } from './todoItem.state';
import { TodoService, TodoItem } from './TodoService';

@Component({
    selector: 'todo-item',
    templateUrl: './todoItem.component.html'
})
export class TodoItemComponent extends WithStateBase<TodoItemState> {

    private readonly _todoService = new TodoService();

    constructor() {
        super(new TodoItemState(), TodoItemState.ngInputs, TodoItemState.ngOutputs);
    }

    public onAfterStateApplied() {
    }    
}
