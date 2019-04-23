import { Component } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoListState } from './todoList.state';
import { TodoService, TodoItem } from './TodoService';

@Component({
    selector: 'todo-list',
    templateUrl: './todoList.component.html'
})
export class TodoListComponent extends WithStateBase<TodoListState> {

    private readonly _todoService = new TodoService();

    constructor() {
        super(new TodoListState(), TodoListState.ngInputs, TodoListState.ngOutputs);

        this.modifyState("itemsRequest", "requested");
    }

    public onAfterStateApplied() {
        if (this.state.itemsRequest === "requested") {
            this.modifyState("itemsRequest", "inProgress");
            this.loadItems();
        }
    }

    private async loadItems(): Promise<void> {
        const items = await this._todoService.getItems();
        this.modifyState("items", items);
        this.modifyState("itemsRequest","done");
    }
    
}
