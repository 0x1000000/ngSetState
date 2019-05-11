import { TodoItem } from './TodoService';
import { In } from "ng-set-state";

export type Mode = "view" | "edit";

export class TodoItemState
{
    public static readonly ngInputs: string[] = ["item"];

    public static readonly ngOutputs: string[] = [];

    @In()
    public readonly item: TodoItem | null = null;

    public readonly mode: Mode = "view";

    public readonly editableText: string = "";

    public withEditMode(): Partial<TodoItemState> | null {
        if (this.mode === "view" && this.item != null) {

            const text = this.item != null ? this.item.name : "";

            return { mode: "edit", editableText: text };
        }
        return null;
    }

    public withEditEnd(): Partial<TodoItemState> | null {
        if (this.mode === "edit") {

            if (this.item !== null) {

                if (this.editableText !== this.item.name) {
                    return { mode: "view", item: Object.assign({}, this.item, { name: this.editableText })};
                }
                return {
                    mode: "view"
                };

            } else {
                if (this.editableText) {
                    return {
                        mode: "view",
                        item: { id: 0, name: this.editableText, priority: "normal", status: false }
                    };
                }
                return {
                    mode: "view"
                };
            }
        }
        return null;
    }
}
