import { TodoItem } from './TodoService';
import { In } from "ng-set-state";

export class TodoItemState
{
    public static readonly ngInputs: string[] = ["item"];

    public static readonly ngOutputs: string[] = [];

    @In()
    public readonly item: TodoItem | null = null;
}
