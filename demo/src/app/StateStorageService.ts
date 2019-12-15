export class StateStorageService {

    private readonly _storage = new Map<string, any>();

    private readonly _subscribers: { component: Object, key: string, handler: (state: any) => void }[] = [];

    public getState<TState>(key: string, defaultGetter : () => TState): TState {
        if (!this._storage.has(key)) {
            this._storage.set(key, defaultGetter());
        }
        return this._storage.get(key);
    }

    public setState<TState>(key: string, state: TState): void {
        this._storage.set(key, state);
        for (const s of this._subscribers) {
            if (s.key === key) {
                s.handler(state);
            }
        }
    }

    public subscibe<TState>(component: Object, key: string, handler: (state: TState) => void) {
        this._subscribers.push({ component: component, key: key, handler: handler });
    }

    public isSubscribed(component: Object): boolean {
        return this._subscribers.findIndex(s => s.component === component) >= 0;
    }

    public release(component: Object) {
        let index = -1;
        do {
            index = this._subscribers.findIndex(s => s.component === component);
            if (index >= 0) {
                this._subscribers.splice(index, 1);
            }
        } while (index >= 0)
    }

}
