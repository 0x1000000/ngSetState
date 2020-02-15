import { RunningModifier, AsyncModifier } from './domain';

export class RunningPool<TState> {

    private readonly _storage: RunningModifier<TState>[] = [];

    private readonly _lockQueue: AsyncModifier<TState>[] = [];

    private _counter: number = 0;

    public nextOrCurrentId(modifier: AsyncModifier<TState>): [number, number|null] | null {

        const running = this.getByModifierId(modifier);

        const behaviour = modifier.asyncData.behaviourOnConcurrentLaunch;

        let oldId: number|null = null;

        if (running) {
            if (behaviour === "replace") {
                oldId = running.id;
            }
            else if (behaviour === "cancel") {
                return null;
            }

            else if (behaviour === "putAfter") {
                running.next = modifier;
                return null;
            }
            else if (behaviour !== "concurrent") {
                throw new Error("Unknown behaviour: " + behaviour);
            }
        }

        if (this.putIntoLockQueue(modifier)) {
            return null;
        }

        const id = this._counter++;
        if (this._counter === Number.MAX_SAFE_INTEGER) {
            this._counter = 0;
        }

        return [id, oldId];
    }

    public addNewAndDeleteOld(id: number, promise: Promise<void>, modifier: AsyncModifier<TState>, oldId: number | null) {

        const newItem: RunningModifier<TState> = {
            id: id,
            modifier: modifier,
            promise: promise,
            next: null
        };

        this._storage.push(newItem);
        if (oldId != null) {
            const pending = this.deleteByIdAndGetPendingModifier(oldId);
            if (pending != null) {
                throw new Error("Replaced modifier cannot have a pending one");
            }
        }
    }

    public exists(id: number) {
        return this._storage.findIndex(i => i.id === id) >= 0;
    }

    public deleteByIdAndGetPendingModifier(id: number): AsyncModifier<TState> | null {

        let result: AsyncModifier<TState> | null = null;

        const index = this._storage.findIndex(i => i.id === id);
        if (index >= 0) {
            result = this._storage[index].next;
            this._storage.splice(index, 1);
        }

        if (result == null) {
            result = this.extractFromLockQueue();
        }

        return result;
    }

    public getAllPromises(): Promise<any>[] {
        return this._storage.map(i => i.promise);
    }

    private getByModifierId(modifier: AsyncModifier<TState>): RunningModifier<TState> | null {
        const index = this._storage.findIndex(i => i.modifier === modifier);
        return index < 0 ? null : this._storage[index];
    }

    private putIntoLockQueue(modifier: AsyncModifier<TState>): boolean {
        const targetLocks = modifier.asyncData.locks;
        if (targetLocks == null || targetLocks.length < 1) {
            return false;
        }

        for (const ri of this._storage) {
            if (ri.modifier.asyncData.locks != null && ri.modifier.asyncData.locks.length > 0) {
                if (RunningPool.locksIntersect(ri.modifier, modifier)) {
                    this._lockQueue.push(modifier);
                    return true;
                }
            }
        }
        return false;
    }

    private extractFromLockQueue(): AsyncModifier<TState> | null {
        if (this._lockQueue.length < 1) {
            return null;
        }
        let index = 0;
        if (this._storage.length > 0) {
            index = this._lockQueue.findIndex(lq => !this._storage.some(s => RunningPool.locksIntersect(s.modifier, lq)));
        }
        let res: AsyncModifier<TState> | null = null;
        if (index >= 0) {
            res = this._lockQueue[index];
            this._lockQueue.splice(index, 1);
        }
        return res;
    }

    private static locksIntersect<TState>(x: AsyncModifier<TState>, y: AsyncModifier<TState>): boolean {
        const xL = x.asyncData.locks;
        const yL = y.asyncData.locks;

        if (xL == null || xL.length < 1 || yL == null || yL.length < 1) {
            return false;
        }
        return xL.some(xLi => yL.some(yLi => yLi === xLi));
    }
}
