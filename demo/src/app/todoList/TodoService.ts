export class TodoService {

    private _storage: TodoItem[];

    private _counter: number = 0;

    constructor() {
        this._storage = [
            { id: ++this._counter, name: "Star ngSetState on GitHub", priority: "normal", status: false },
        ];
    }

    public async getItems(): Promise<TodoItem[]> {
        await TodoService.delayMs(7000);
        return Array.from(this._storage);
    }

    public async saveItems(items: TodoItem[]): Promise<TodoItem[]> {
        await TodoService.delayMs(5000);
        const result: TodoItem[] = [];
        if (Math.round(Math.random() * 5) === 1) {
            throw new Error("Random error");
        }
        for (const updatedItem of items) {
            if (updatedItem.id <= 0/**New Item*/) {
                const created = Object.assign({}, updatedItem, { id: ++this._counter });
                this._storage.push(created);
                result.push(created);
            } else {
                result.push(updatedItem);
                const index = this._storage.findIndex(i => i.id === updatedItem.id);

                if (index >= 0) {
                    this._storage[index] = Object.assign({}, updatedItem);
                } else {
                    throw new Error(`Item with ${updatedItem.id} does not exist in the storage`);
                }
            }
        }
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

export type TodoItem = {
    readonly id: number,
    readonly name: string,
    readonly priority: "low"|"normal"|"high",
    readonly status: boolean,
}
