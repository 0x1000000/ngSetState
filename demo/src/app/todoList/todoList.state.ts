import { TodoItem } from './TodoService';
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

    public withSavedItems(itemModels: TodoItem[]): Partial<TodoListState> | null {
        if (this.itemsInProgress.length !== itemModels.length) {
            throw new Error("Number of saved item do not equal number of saving items");
        }

        const newItems = this.items.map(i => {
            const modIndex = this.itemsInProgress.indexOf(i);
            if (modIndex >= 0) {
                return i.withModel(itemModels[modIndex], false);
            }
            return i;
        });

        const [newChangedItemsQueue, newItemsInProgress] = this.changedItemsQueue.length > 0
            ? [[], this.changedItemsQueue]
            : [this.changedItemsQueue, []];

        return {
            items: newItems,
            itemsInProgress: newItemsInProgress,
            changedItemsQueue: newChangedItemsQueue
        };
    }

    public withNewChangedItem(item: ItemViewModel, newModel: TodoItem | null): Partial<TodoListState> | null {

        if (item.model === newModel) {
            return null;
        }

        const [newItems, changedItem, action] = this.getUpdatedItems(item, item.withModel(newModel, item.model !== newModel));

        const newNewItem = action === "add" ? ItemViewModel.createNew() : this.newItem;

        if (this.itemsInProgress.length < 1) {
            return {
                items: newItems,
                itemsInProgress: [changedItem],
                newItem: newNewItem
            }
        } else {
            return {
                items: newItems,
                changedItemsQueue: this.pushToQueue(changedItem),
                newItem: newNewItem
            }
        }
    }

    private getUpdatedItems(currentItem: ItemViewModel, newItem: ItemViewModel): [ItemViewModel[], ItemViewModel, "update"|"add"|"delete"|"none"]  {
        if (currentItem === newItem) {
            return [this.items, newItem, "none"];
        }
        let detected = 0;
        let action: "update" | "add" | "delete" = "update";
        const result = this.items.reduce((acc, next) => {
            if (next === currentItem) {
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

    private pushToQueue(currentItem: ItemViewModel) {
        if (this.changedItemsQueue.indexOf(currentItem) >= 0) {
            return this.changedItemsQueue;
        }
        const newQueue = Object.assign([], this.changedItemsQueue);
        newQueue.push(currentItem);
        return newQueue;
    }
}
