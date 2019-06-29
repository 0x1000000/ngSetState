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

    public async saveItems(items: TodoItem[]): Promise<TodoItem[]> {
        await TodoService.delayMs(5000);

        const newItems: TodoItem[] = [];
        const result: TodoItem[] = [];

        for (const item of items) {
            if (item.id < 0) {
                const created = Object.assign({}, item, { id: this._counter++ });
                newItems.push(created);
                result.push(created);
            } else {
                result.push(item);
                const index = this._storage.findIndex(i => i.id === item.id);

                if (index >= 0) {
                    this._storage[index] = item;
                } else {
                    newItems.push(item);
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

export type TodoItem = {
    readonly id: number,
    readonly name: string,
    readonly priority: "low"|"normal"|"high",
    readonly status: boolean,
}
