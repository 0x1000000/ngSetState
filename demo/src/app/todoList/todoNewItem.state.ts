import { TodoItem } from './TodoService';
import { Out } from "ng-set-state";

export type Mode = "view" | "edit";

export class TodoNewItemState
{
    public static readonly ngInputs: string[] = [];

    public static readonly ngOutputs: string[] = ["itemChange"];

    @Out()
    public readonly item: TodoItem | null = null;

    public readonly mode: Mode = "view";

    public readonly editableText: string = "";

    public withEditMode(): Partial<TodoNewItemState> | null {
        if (this.mode === "view") {
            return { mode: "edit", editableText: "" };
        }
        return null;
    }

    public withEditEnd(): Partial<TodoNewItemState> | null {
        if (this.mode === "edit") {
            if (this.editableText) {
                return {
                    mode: "view",
                    item: { id: 0, name: this.editableText, priority: "normal", status: false },
                    editableText: ""
                };
            }
            return {
                mode: "view"
            };
        }
        return null;
    }
}
