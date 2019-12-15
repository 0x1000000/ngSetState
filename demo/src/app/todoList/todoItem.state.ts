import { TodoItem } from './TodoService';
import { In, Out, With } from "ng-set-state";
import { SyncMode } from './ItemViewModel';

export type Mode = "view" | "edit";

export class TodoItemState
{
    private static readonly newItemText = "Add a new task";

    public static readonly ngInputs: string[] = ["item", "syncMode"];

    public static readonly ngOutputs: string[] = ["itemChange", "isDeletedChange"];

    @In()
    @Out()
    public readonly item: TodoItem | null = null;

    public readonly mode: Mode = "view";

    @In()
    public readonly syncMode: SyncMode | null = null;

    @Out()
    public readonly isDeleted: boolean = false;

    public readonly isButtonsVisible: boolean = true;

    public readonly editableText: string = "";

    public readonly visibleText: string = TodoItemState.newItemText;

    public readonly isCloudIndicatorVisible: boolean = false;

    public readonly isClockIndicatorVisible: boolean = false;

    public readonly isEditVisible: boolean = true;

    public readonly isDeleteVisible: boolean = true;

    public readonly isRefreshVisible: boolean = false;

    @With("mode", "isDeleted")
    public static calcIsButtonsVisible(currentState: TodoItemState): Partial<TodoItemState> | null {
        return {
            isButtonsVisible: currentState.mode !== "edit" && !currentState.isDeleted
        }
    }

    @With("item")
    public static onItemChange(currentState: TodoItemState): Partial<TodoItemState> | null {
        if (currentState.item == null) {
            throw new Error("item cannot be null here");
        }
        return {
            visibleText: currentState.item.name,
        };
    }
    
    @With("syncMode")
    public static onSuncModeChange(currentState: TodoItemState): Partial<TodoItemState> | null {
        return {
            isCloudIndicatorVisible: currentState.syncMode === "active",
            isClockIndicatorVisible: currentState.syncMode === "pending",
            isEditVisible: currentState.syncMode !== "error",
            isDeleteVisible: currentState.syncMode !== "error",
            isRefreshVisible: currentState.syncMode === "error",
        }
    }

    public withEditMode(): Partial<TodoItemState> | null {
        if (this.isDeleted) {
            return null;
        }
        if (this.mode === "view") {
            if (this.item === null) {
                throw new Error("Inconsistent state. item cannot be 'new' here");
            }
            return { mode: "edit", editableText: this.item.name };
        }
        return null;
    }

    public withEditEnd(): Partial<TodoItemState> | null {
        if (this.mode === "edit") {
          
            if (this.item === null) {
                throw new Error("Inconsistent state. item cannot be 'new' here");
            }

            if (this.editableText && this.editableText !== this.item.name) {
                return {
                    mode: "view",
                    item: Object.assign({}, this.item, { name: this.editableText })
                };
            }
            
            return {
                mode: "view"
            };
        }
        return null;
    }

    public withCompleted(): Partial<TodoItemState> | null {
        if (this.item == null || this.isDeleted) {
            return null;
        }

        return { item: Object.assign({}, this.item, { status: !this.item.status }) };
    }

    public withRefresh(): Partial<TodoItemState> | null {
        if (this.item == null || this.isDeleted) {
            return null;
        }

        return { item: Object.assign({}, this.item) };
    }
}
