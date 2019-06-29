import { Component, ChangeDetectorRef } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoListState } from './todoList.state';
import { TodoService, TodoItem } from './TodoService';
import { ItemViewModel } from "./ItemViewModel";
import { StateStorageService } from "../StateStorageService";

@Component({
    selector: 'todo-list',
    templateUrl: './todoList.component.html',
    inputs: TodoListState.ngInputs,
    outputs: TodoListState.ngOutputs
})
export class TodoListComponent extends WithStateBase<TodoListState> {

    private static readonly storageKey = "todoListState";

    constructor(
        private readonly _stateStorage: StateStorageService,
        private readonly _cd: ChangeDetectorRef,
        private readonly _todoService: TodoService)
    {
        super(_stateStorage.getState(TodoListComponent.storageKey, () => new TodoListState()), TodoListState.ngInputs, TodoListState.ngOutputs);

        this.modifyState("loadRequest", "requested");
    }

    public onAfterStateApplied(previousState: TodoListState) {
        if (this.state.loadRequest === "requested") {
            this.loadItems();
        }

        if (this.state.itemsInProgress.length > 0 && this.state.itemsInProgress !== previousState.itemsInProgress) {
            this.saveItems();
        }

        if (!this.state.status) {
            this._stateStorage.setState(TodoListComponent.storageKey, this.state);
        }
        if (this._cd) {
            this._cd.markForCheck();
        }
    }

    public onItemChange(currentViewModel: ItemViewModel, newItem: TodoItem) {
        this.modifyStateDiff(this.state.withNewChangedItem(currentViewModel, newItem));
    }

    public onItemDeleted(currentViewModel: ItemViewModel) {
        this.modifyStateDiff(this.state.withNewChangedItem(currentViewModel, null));
    }

    public trackByFn(index: number, item: ItemViewModel): number {
        return item.vmId;
    }

    private async loadItems(): Promise<void> {
        this.modifyState("loadRequest", "inProgress");
        const items = await this._todoService.getItems();
        this.modifyStateDiff(this.state.withLoadedItems(items));
    }

    private async saveItems(): Promise<void> {
        const changedModels = this.state.itemsInProgress.filter(i => i.model != null).map(i => i.model as TodoItem);
        const toDelete = this.state.itemsInProgress.filter(i => i.model == null).map(i => i.previousModel as TodoItem);

        if (changedModels.length > 0) {
            const result = await this._todoService.saveItems(changedModels);
            this.modifyStateDiff(this.state.withSavedItems(result));
        }

        if (toDelete.length > 0) {
            await this._todoService.deleteItems(toDelete);
            this.modifyStateDiff(this.state.withSavedItems(toDelete));
        }
    }
    
}
