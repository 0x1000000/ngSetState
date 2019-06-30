export class TodoService {

    private _storage: TodoItem[];

    private _counter: number = 0;

    constructor() {
        this._storage = [
            { id: ++this._counter, name: "Item 1", priority: "normal", status: false },
            { id: ++this._counter, name: "Item 3", priority: "low", status: false }
        ];
    }

    public async getItems(): Promise<TodoItem[]> {
        await TodoService.delayMs(700);
        return Array.from(this._storage);
    }

    public async saveItems(items: TodoItemCtx[]): Promise<TodoItemCtx[]> {
        await TodoService.delayMs(5000);

        const newItems: TodoItem[] = [];
        const result: TodoItemCtx[] = [];

        for (const itemCtx of items) {
            if (itemCtx.model.id <= 0/**New Item*/) {
                const created = Object.assign({}, itemCtx.model, { id: ++this._counter });
                newItems.push(created);
                result.push({ctxId: itemCtx.ctxId, model: created });
            } else {
                result.push(itemCtx);
                const index = this._storage.findIndex(i => i.id === itemCtx.model.id);

                if (index >= 0) {
                    this._storage[index] = itemCtx.model;
                } else {
                    newItems.push(itemCtx.model);
                }
            }
        }
        this._storage.push(...newItems);
        return result;
    }

    public async deleteItems(items: TodoItem[]): Promise<void> {
        await TodoService.delayMs(1000);

        for (const item of items) {
            const index = this._storage.findIndex(i => i.id === item.id);
            if (index >= 0) {
                this._storage.splice(index, 1);
            }
        }
    }


    private static delayMs(value: number): Promise<void> {
        return new Promise<void>((resolver) => setTimeout(() => resolver(), value));
    }
}

export type TodoItemCtx = {
    readonly ctxId: number,
    readonly model: TodoItem,
}

export type TodoItem = {
    readonly id: number,
    readonly name: string,
    readonly priority: "low"|"normal"|"high",
    readonly status: boolean,
}
