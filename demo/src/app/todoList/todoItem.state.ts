import { TodoItem } from './TodoService';
import { In, Out, With } from "ng-set-state";

export type Mode = "view" | "edit";

export class TodoItemState
{
    private static readonly newItemText = "Add a new task";

    public static readonly ngInputs: string[] = ["item", "isNew", "isDirty"];

    public static readonly ngOutputs: string[] = ["itemChange", "isDeletedChange"];

    @In()
    @Out()
    public readonly item: TodoItem | null = null;

    public readonly mode: Mode = "view";

    @In()
    public readonly isNew: boolean = false;

    @In()
    public readonly isDirty: boolean = false;

    @Out()
    public readonly isDeleted: boolean = false;

    public readonly isButtonsVisible: boolean = true;

    public readonly editableText: string = "";

    public readonly visibleText: string = TodoItemState.newItemText;

    @With("isNew", "mode", "isDeleted")
    public static calcIsButtonsVisible(currentState: TodoItemState): Partial<TodoItemState> | null {
        return {
            isButtonsVisible: !currentState.isNew && currentState.mode !== "edit" && !currentState.isDeleted
        }
    }

    @With("item")
    public static onItemChange(currentState: TodoItemState): Partial<TodoItemState> | null {
        if (currentState.item == null) {
            throw new Error("item cannot be null here");
        }

        if (!currentState.isNew) {
            return {
                visibleText: currentState.item.name,
            };
        }
        return null;
    }

    @With("isNew")
    public static onIsNewChange(currentState: TodoItemState): Partial<TodoItemState> | null {

        if (currentState.isNew) {
            return {
                visibleText: TodoItemState.newItemText,
            }
        }
        return {
            visibleText: currentState.item != null ? currentState.item.name : "",
        }
    }

    public withEditMode(): Partial<TodoItemState> | null {
        if (this.isDeleted) {
            return null;
        }
        if (this.mode === "view" && !this.isNew) {
            if (this.item === null) {
                throw new Error("Inconsistent state. item cannot be 'new' here");
            }
            return { mode: "edit", editableText: this.item.name };
        }
        if (this.mode === "view" && this.isNew) {
            return { mode: "edit", editableText: "" };
        }
        return null;
    }

    public withEditEnd(): Partial<TodoItemState> | null {
        if (this.mode === "edit") {
            if (this.isNew) {
                if (this.editableText) {
                    return {
                        mode: "view",
                        item: { id: 0, name: this.editableText, priority: "normal", status: false },
                        editableText: ""
                    };
                }
            } else {

                if (this.item === null) {
                    throw new Error("Inconsistent state. item cannot be 'new' here");
                }

                if (this.editableText && this.editableText !== this.item.name) {
                    return {
                        mode: "view",
                        item: Object.assign({}, this.item, { name: this.editableText })
                    };
                }

            }
            return {
                mode: "view"
            };
        }
        return null;
    }
}
