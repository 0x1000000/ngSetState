import { TodoItem, TodoItemCtx } from './TodoService';
import { ItemViewModel } from "./ItemViewModel";
import { With } from 'ng-set-state';

export class TodoListState
{
    public static readonly ngInputs: string[] = [];

    public static readonly ngOutputs: string[] = [];

    public readonly newItem = ItemViewModel.createNew();

    public readonly items: ItemViewModel[] = [];

    public readonly changedItemsQueue: ItemViewModel[] = [];

    public readonly itemsInProgress: ItemViewModel[] = [];

    public readonly loadRequest: "requested" | "inProgress" | "done" = "done";

    public readonly status: string = "";

    @With("loadRequest", "itemsInProgress")
    public static calcStatus(currentState: TodoListState): Partial<TodoListState> | null {
        if (currentState.loadRequest === "inProgress") {
            return { status: "Requesting new items" };
        }
        if (currentState.itemsInProgress.length > 0) {
            return { status: `Saving ${currentState.itemsInProgress.length} item(s)` }
        }
        return !currentState.status ? null : {status: ""};
    }

    public withLoadedItems(itemModels: TodoItem[]): Partial<TodoListState> | null {
        return {
            items: itemModels.map(im => ItemViewModel.createExisting(im)),
            loadRequest: "done"
        }
    }

    public withUpdatedItem(item: ItemViewModel, newModel: TodoItem | null): Partial<TodoListState> | null {

        if (item.model === newModel) {
            return null;
        }

        const [newItems, changedItem, action] = TodoListState.getUpdatedItems(this.items, item, item.withModel(newModel, item.model !== newModel));

        const newNewItem = action === "add" ? ItemViewModel.createNew() : this.newItem;

        let newQueue = this.changedItemsQueue;
        if (this.itemsInProgress.length > 0) {
            newQueue = TodoListState.getQueueWithItem(newQueue, changedItem);
        }

        return {
            items: newItems,
            itemsInProgress: this.itemsInProgress.length < 1 ? [changedItem] : this.itemsInProgress,
            newItem: newNewItem,
            changedItemsQueue: newQueue,
        }
    }

    public withSavedItems(itemModels: TodoItemCtx[]): Partial<TodoListState> | null {

        const newItems = TodoListState.getUpdatedItemsByContextModels(this.items, itemModels);

        let newChangedItemsQueue = TodoListState.getUpdatedItemsByContextModels(this.changedItemsQueue, itemModels);

        let newItemsInProgress = this.itemsInProgress.filter(iip => itemModels.findIndex(si => si.ctxId === iip.vmId));

        if (newItemsInProgress.length < 1 && this.changedItemsQueue.length > 0) {
            newItemsInProgress = newChangedItemsQueue;
            newChangedItemsQueue = [];
        }

        return {
            items: newItems,
            itemsInProgress: newItemsInProgress,
            changedItemsQueue: newChangedItemsQueue
        };
    }

    private static getUpdatedItems(items: ItemViewModel[], currentItem: ItemViewModel, newItem: ItemViewModel): [ItemViewModel[], ItemViewModel, "update"|"add"|"delete"|"none"]  {
        if (currentItem === newItem) {
            return [items, newItem, "none"];
        }
        let detected = 0;
        let action: "update" | "add" | "delete" = "update";
        const result = items.reduce((acc, next) => {
            if (next.vmId === currentItem.vmId) {
                detected++;
                if (newItem.model != null) {
                    acc.push(newItem);
                    action = "update";
                } else {
                    action = "delete";
                }
            } else {
                acc.push(next);
            }
            return acc;
        }, [] as ItemViewModel[]);

        if (detected > 1) {
            throw new Error(`The items was found "${detected}" times`);
        }
        if (detected === 0) {
            action = "add";
            result.push(newItem);
        }

        return [result, newItem, action];
    }

    private static getUpdatedItemsByContextModels(items: ItemViewModel[], contextModels: TodoItemCtx[]): ItemViewModel[] {
        let detect = false;
        const result = items.map(i => {
            const correspondingItem = contextModels.find(sItem => sItem.ctxId === i.vmId);
            if (correspondingItem == null) {
                return i;
            }
            detect = true;

            if (i.model == null && i.previousModel != null) {
                return i.withPreviousModel(correspondingItem.model);
            }

            return i.withModel(correspondingItem.model, false);
        });


        return detect ? result : items;
    }

    private static getQueueWithItem(changedItemsQueue: ItemViewModel[], currentItem: ItemViewModel) {
        const queueItem = changedItemsQueue.find(i => i.vmId === currentItem.vmId);
        if (queueItem != null) {
            if (queueItem.model === currentItem.model) {
                return changedItemsQueue;
            }
            return changedItemsQueue.map(i => i === queueItem ? currentItem : i);
        }
        const newQueue = Object.assign([], changedItemsQueue);
        newQueue.push(currentItem);
        return newQueue;
    }
}
