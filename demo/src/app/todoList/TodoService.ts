export class TodoService {

    private _storage: TodoItem[];

    constructor() {
        this._storage = [
            {id: 1, name: "Item 1", priority: "normal", status: false},
            {id: 2, name: "Item 3", priority: "low", status: false}
        ];
    }

    public async getItems(): Promise<TodoItem[]> {
        await TodoService.delayMs(700);
        return Array.from(this._storage);
    }

    private static delayMs(value: number): Promise<void> {
        return new Promise<void>((resolver) => setTimeout(() => resolver(), value));
    }
}

export type TodoItem = {
    readonly id: number,
    readonly name: string,
    readonly priority: "low"|"normal"|"high",
    readonly status: boolean,
}
