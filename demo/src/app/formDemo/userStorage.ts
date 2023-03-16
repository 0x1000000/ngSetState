import { AsyncContext, AsyncInit, ComponentState, ComponentStateDiff, initializeImmediateStateTracking, IStateHandler, With, WithAction, WithActionAsync, WithAsync } from "ng-set-state";
import { StateDiff } from "ng-set-state/dist/api/state_tracking";
import { delayMs } from "../lib/helpers";
import { ActionDeleteItem, ActionItemEdited, ActionNewItem, ActionSaveRequest } from "./userStorage.Actions";

export type User = {
    id: number,
    firstName: string,
    lastName: string,
    active: boolean
}

export type ItemStatus = "" | "invalid" | "dirty" | "saving"

export type UserViewModel = {
    user: User,
    originalUser: User| null,
    isValid: boolean,
}

type State = ComponentState<UserStorage>;
type NewState = StateDiff<UserStorage>;

export class UserStorage {

    readonly items: UserViewModel[] = [];

    readonly itemStatus: {[id: number]: ItemStatus} = {};

    readonly selectedItem: UserViewModel | null = null;

    readonly loading: boolean = true;

    readonly pendingIds: number[] = [];

    readonly savingIds: number[] = [];

    constructor() {
        initializeImmediateStateTracking<UserStorage>(this, {
            includeAllPredefinedFields: true
        });
    }

    @AsyncInit()
    static async init(s: AsyncContext<State>): Promise<NewState> {
        const initialState = s();

        await delayMs(1000);

        return {
            items: [
                { user: {id: 1, firstName: "FirstName 1", lastName: "LastName 1", active: true}, originalUser: null, isValid: true },
                { user: {id: 2, firstName: "FirstName 2", lastName: "LastName 2", active: true}, originalUser: null, isValid: true },
            ],
            loading: false
        };
    }

    @WithAction(ActionItemEdited)
    static onUserEdited(action: ActionItemEdited, state: State): NewState {
        const [items, newItem] = UserStorage.reCreateItems(state.items, action.id, action.change);

        return {
            items,
            pendingIds: UserStorage.checkPending(state.pendingIds, newItem)
        };
    }

    @With('items', 'pendingIds', 'savingIds')
    static calcItemStatus(state: State): NewState {
        const itemStatus: {[id: number]: ItemStatus} = {};

        let selectedItem = state.selectedItem;

        for (let i of state.items) {
            let s: ItemStatus = '';

            if (selectedItem != null && selectedItem.user.id === i.user.id) {
                selectedItem = i;
            }

            if(i.originalUser != null) {
                if (!i.isValid) {
                    s = 'invalid';
                } else if (state.pendingIds.includes(i.user.id)) {
                    s = 'dirty';
                }
                else if (state.savingIds.includes(i.user.id)) {
                    s = 'saving';    
                }
                else {
                    throw new Error('Inconsistent state');
                }
            } else if (state.savingIds.includes(i.user.id)) {
                s = 'saving';
            }
            itemStatus[i.user.id] = s;
        }

        return { 
            itemStatus,
            selectedItem
        };
    }

    @With('pendingIds', 'savingIds').Debounce(2000)
    static onPendingIsReady(state: State): NewState {
        if(state.pendingIds.length > 0 && state.savingIds.length === 0) {
            return [new ActionSaveRequest()];
        }
        return null;
    }

    
    @WithAction(ActionDeleteItem)
    static deleteNewItem(a: ActionDeleteItem, state: State): NewState {
        const items = state.items.filter(i => i.user.id !== a.id);
        const pendingIds = state.pendingIds.includes(a.id)
            ? state.pendingIds.filter(i => i !== a.id)
            : state.pendingIds;
        const selectedItem = state.selectedItem?.user.id === a.id 
            ? null
            :state.selectedItem

        return {
            items,
            pendingIds,
            selectedItem
        };
    }

    @WithAction(ActionNewItem)
    static createNewItem(a: ActionNewItem, state: State): NewState {
        const newId = state.items.map(i => i.user.id).reduce((acc, next)=> next < acc ? next : acc , 0) - 1;
        const newUser: User = {id: newId, firstName: '', lastName: '', active: false };
        const newItem: UserViewModel = {user: newUser, originalUser: newUser, isValid: false};

        const items = [...state.items];
        items.push(newItem);

        return {
            items,
            selectedItem: newItem
        };
    }

    @WithAction(ActionSaveRequest)
    static onSaveRequest(a: ActionSaveRequest, state: State): NewState {
        if(state.pendingIds.length > 0 && state.savingIds.length === 0) {
            return {
                pendingIds: [],
                savingIds: state.pendingIds
            };
        }
        return null;
    }

    @With('savingIds')
    static removeDirtyForSaving(state: State): NewState {
        if (state.savingIds.length > 0) {
            return {
                items: state.items.map(i => state.savingIds.includes(i.user.id) && i.originalUser != null
                    ? ({...i, ...{ originalUser: null } satisfies Partial<UserViewModel>}) 
                    : i)
            };
        }
        return null;
    }

    @WithAsync('savingIds').OnConcurrentLaunchThrowError()
    static async save(c: AsyncContext<UserStorage>): Promise<NewState> {
        const initialState = c();
        if (initialState.savingIds.length > 0) {
            await delayMs(5000);

            const currentSate =  c();

            const newItems = [...currentSate.items];

            for(const sId of initialState.savingIds) {
                const index = newItems.findIndex(x=>x.user.id === sId);
                if(index >= 0) {
                    newItems[index] = {...newItems[index], ...{originalUser: null}};
                } else {
                    throw new Error('No user');
                }
            }

            return {
                items: newItems,
                savingIds: currentSate.pendingIds,
                pendingIds: []
            }
        }
        return null;
    }

    static reCreateItems(items: UserViewModel[], id: number, change: Partial<UserViewModel>): [UserViewModel[], UserViewModel] {
        let newItems = items;
        const index = newItems.findIndex(i => i.user.id === id);
        if (index >= 0) {
            newItems = [...newItems];
            newItems[index] = {...newItems[index], ...change};
        } else {
            throw new Error(`Could not find an item with id ${id}`);
        }        
        return [newItems, newItems[index]];
    }

    static checkPending(pending: number[], item: UserViewModel): number[] {
        const index = pending.indexOf(item.user.id);

        const shouldBePending = item.isValid && item.originalUser != null;

        if(index >= 0 && !shouldBePending) {
            pending = [...pending];
            pending.splice(index, 1);
        }

        if(index < 0 && shouldBePending) {
            pending = [...pending];
            pending.push(item.user.id);
        }

        return pending;
    }
}
