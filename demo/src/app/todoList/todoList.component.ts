import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { TodoListState } from './todoList.state';
import { TodoService, TodoItem } from './TodoService';
import { ItemViewModel } from "./ItemViewModel";
import { StateStorageService } from "../StateStorageService";

@Component({
    selector: 'todo-list',
    templateUrl: './todoList.component.html',
    inputs: TodoListState.ngInputs,
    outputs: TodoListState.ngOutputs,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoListComponent extends WithStateBase<TodoListState> implements OnChanges, OnDestroy {

    private static readonly storageKey = "todoListState";

    private _isDestroyed: boolean = false;

    constructor(
        private readonly _stateStorage: StateStorageService,
        private readonly _changeDetector: ChangeDetectorRef,
        todoService: TodoService)
    {
        super(_stateStorage.getState(TodoListComponent.storageKey, ()=>new TodoListState(todoService))!, TodoListState.ngInputs, TodoListState.ngOutputs);

        this._stateStorage.subscibe<TodoListState>(this,
            TodoListComponent.storageKey,
            (state) => {
                if (state !== this.state) {
                    this.modifyStateDiff(state);
                }
            });
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    async ngOnDestroy() {
        this._isDestroyed = true;
        this.modifyState("isLocked", true);//To prevent changes if there are some async operations not finished
        this._stateStorage.release(this);
        const stateBefore = this.state;
        this._stateStorage.setState(TodoListComponent.storageKey, this.state);
        try {
            await this.whenAll();//Finish all async operations
        }
        finally {
            this.modifyState("isLocked", false);
        }
        
        if (stateBefore !== this.state) {
            this._stateStorage.setState(TodoListComponent.storageKey, this.state);
        }
    }


    public onItemChange(currentViewModel: ItemViewModel, newItem: TodoItem) {
        this.modifyStateDiff(this.state.withUpdatedItem(currentViewModel, newItem));
    }

    public onItemAdded(newItem: TodoItem) {
        this.modifyStateDiff(this.state.withAddedItem(newItem));
    }

    public onItemDeleted(currentViewModel: ItemViewModel) {
        this.modifyStateDiff(this.state.withUpdatedItem(currentViewModel, null));
    }

    public trackByFn(index: number, item: ItemViewModel): number {
        return item.vmId;
    }

    public onAfterStateApplied?(previousState?: TodoListComponent): void {
        if (!this._isDestroyed) {
            this._changeDetector.detectChanges();
        }
    }
}
