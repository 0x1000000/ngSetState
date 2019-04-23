import { TodoItem } from './TodoService';

export class TodoListState
{
    public static readonly ngInputs: string[] = [];

    public static readonly ngOutputs: string[] = [];

    public readonly items: TodoItem[] = [];

    public itemsRequest: "requested" | "inProgress" | "done" = "done";
}
