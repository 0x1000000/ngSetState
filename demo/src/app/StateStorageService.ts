export class StateStorageService {

    private readonly _storage = new Map<string, any>();

    public getState<TState>(key: string, defaultGetter : () => TState): TState {
        if (!this._storage.has(key)) {
            this._storage.set(key, defaultGetter());
        }
        return this._storage.get(key);
    }

    public setState<TState>(key: string, state: TState): void {
        this._storage.set(key, state);
    }
}
