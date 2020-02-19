import { TodoItem, TodoService } from './TodoService';
import { ItemViewModel } from "./ItemViewModel";
import { With, WithAsync, AsyncInit } from 'ng-set-state';

export type NewState = Partial<TodoListState>|null

type UpdateQueueItem = { readonly currentViewModel: ItemViewModel, newModel: TodoItem | null };

type ItemUpdate<T> = { readonly oldValue: T, readonly newValue: T };

export class TodoListState
{
    public static readonly ngInputs: string[] = [];

    public static readonly ngOutputs: string[] = [];

    public readonly items: ItemViewModel[] = [];

    public readonly updateQueue: UpdateQueueItem[] = [];

    public readonly inAction: UpdateQueueItem[] = [];

    public readonly isLocked: boolean = false;//Previous async operation is not done

    public readonly isInit: boolean = false;//Prevent init on state restore

    constructor(public readonly todoService: TodoService) { }

    public withAddedItem(newModel: TodoItem) {

        const newViewModel = ItemViewModel.createNew(newModel);

        const newUpdateQueue = add(this.updateQueue, { currentViewModel: newViewModel, newModel: newModel });
        const newItems = head(this.items, newViewModel);

        return {
            updateQueue: newUpdateQueue,
            items: newItems
        };

    }

    public withUpdatedItem(currentViewModel: ItemViewModel, newModel: TodoItem | null): NewState {
        if (currentViewModel.model === newModel) {
            return null;
        }

        const newViewModel = newModel ? currentViewModel.withModel(newModel, "pending") : currentViewModel;

        const newUpdateQueue = addOrUpdate(this.updateQueue, { currentViewModel: newViewModel, newModel: newModel }, (x, y) => vmComparer(x.currentViewModel, y.currentViewModel));

        const newItems = newModel ? update(this.items, [{ oldValue: currentViewModel, newValue: newViewModel }], vmComparer) : this.items;

        return {
            updateQueue: newUpdateQueue,
            items: newItems
        };
    }

    @AsyncInit().Locks("init")
    public static async init(getState: () => TodoListState): Promise<NewState> {
        const state = getState();
        if (state.isInit) {
            return null;
        }
        let serverModels = await getState().todoService.getItems();

        serverModels = serverModels.reverse();

        const stateAfter = getState();//Some new items could be added

        return { items: add(stateAfter.items, serverModels.map(i => ItemViewModel.createExisting(i))), isInit: true };
    }

    @With("updateQueue").Debounce(2000)
    public static onUpdateQueue(currentSate: TodoListState): NewState {

        if (currentSate.updateQueue.length > 0 && currentSate.inAction.length < 1) {
            return TodoListState.setInAction(currentSate.updateQueue, currentSate.items);
        }
        return null;
    }

    @WithAsync("inAction").Locks("init").OnErrorCall(TodoListState.onSaveError)
    public static async save(getState: () => TodoListState): Promise<NewState> {
        const state = getState();
        const inAction = state.inAction;

        if (inAction.length > 0) {

            const toUpdate = inAction.filter(i => i.newModel != null);
            const toDelete = inAction.filter(i => i.newModel == null).map(i=>i.currentViewModel);

            let updates: { oldValue: ItemViewModel; newValue: ItemViewModel }[] = [];

            if (toUpdate.length > 0) {
                const saved = await state.todoService.saveItems(toUpdate.map(i => i.newModel!));
                if (saved.length !== toUpdate.length) {
                    throw new Error("Error");
                }

                updates = toUpdate.map((old, index) =>
                    ({
                        oldValue: old.currentViewModel,
                        newValue: old.currentViewModel.withModel(saved[index], "saved")
                    }));
            }

            if (toDelete.length > 0) {
                await state.todoService.deleteItems(toDelete.map(i=>i.model));
            }

            const stateAfter = getState();

            let newItems = del(stateAfter.items, toDelete, vmComparer);
            newItems = update(newItems, updates, vmComparer);

            return TodoListState.setInAction(stateAfter.updateQueue, newItems);
        }
        return null;
    }

    private static onSaveError(state: TodoListState, error: any): Partial<NewState> {
        
        let result = TodoListState.setInAction(state.updateQueue, state.items);

        if (result != null && result.inAction != null && result.items != null) {

            const mod = state.inAction.map(ia => ({ oldValue: ia.currentViewModel, newValue: ia.currentViewModel.withsyncMode("error") }));

            result = Object.assign(result, <Partial<TodoListState>>{ items: update(result.items, mod, vmComparer) });
        }

        return result;
    }

    private static setInAction(queue: UpdateQueueItem[], items: ItemViewModel[]): NewState {
        if (queue.length < 1) {
            return {
                items: items,
                inAction: [],
                updateQueue: queue
            }
        }

        const activeList = queue.map(q => ({ currentViewModel: q.currentViewModel.withsyncMode("active"), newModel: q.newModel }));

        const itemsUpdate = queue.map((q, i) => ({ oldValue: q.currentViewModel, newValue: activeList[i].currentViewModel }));

        items = update(items, itemsUpdate, vmComparer);

        return {
            inAction: activeList,
            items: items,
            updateQueue: []
        }
    }
}

function vmComparer(x: ItemViewModel, y: ItemViewModel): boolean {
    return x.vmId === y.vmId;
}

function head<T>(source: T[], newItems: T): T[] {
    const result = [newItems];

    result.push(...source);

    return result;
}

function add<T>(source: T[], newItem: T| T[]): T[] {
    const result = Object.assign([], source);
    if (Array.isArray(newItem)) {
        result.push(...newItem);
    }
    else {
        result.push(newItem);
    }
    
    return result;
}

function addOrUpdate<T>(source: T[], newItem: T, comparer: (x: T, y: T) => boolean): T[] {
    const result: T[] = Object.assign([], source);

    const index = result.findIndex(i => comparer(i, newItem));

    if (index < 0) {
        result.push(newItem);
    } else {
        result[index] = newItem;
    }

    return result;
}


function update<T>(source: T[], update: ItemUpdate<T>[], comparer: (x: T, y: T) => boolean): T[] {
    if (update == null || update.length < 1) {
        return source;
    }

    const result: T[] = Object.assign([], source);
    for (const newItem of update) {
        const index = result.findIndex(i=> comparer(i, newItem.oldValue));

        if (index < 0) {
            throw new Error("Could not find old element");
        } else {
            result[index] = newItem.newValue;
        }
    }
    return result;
}


function del<T>(source: T[], toDelete: T[], comparer: (x: T, y: T) => boolean): T[] {
    if (toDelete == null || toDelete.length < 1 || source == null || source.length < 1) {
        return source;
    }

    return source.filter(s => toDelete.findIndex(d => comparer(s, d)) < 0);
}
