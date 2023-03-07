import { RunningModifier, ModifierWithParameters } from './domain';

export class RunningPool<TComponent> {

    private readonly _storage: RunningModifier<TComponent>[] = [];

    private readonly _lockQueue: ModifierWithParameters<TComponent, any>[] = [];

    private _counter: number = 0;

    public nextOrCurrentId(modifier: ModifierWithParameters<TComponent, any>): [number, number|null] | null {

        const running = this.getByModifierId(modifier);

        const behavior = modifier.mod.asyncData.behaviorOnConcurrentLaunch;

        let oldId: number|null = null;

        if (running) {
            if (behavior === "replace") {
                oldId = running.id;
            }
            else if (behavior === "cancel") {
                return null;
            }
            else if (behavior === "putAfter") {
                running.next = modifier;
                return null;
            }
            else if (behavior === "throwError") {
                throw new Error(`Concurrent launch is prohibited for '${modifier.mod.propertyKey?.toString()}'`);
            }
            else if (behavior !== "concurrent") {
                throw new Error("Unknown behavior: " + behavior);
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

    public addNewAndDeleteOld(id: number, promise: Promise<void>, modifierWithParameters: ModifierWithParameters<TComponent, any>, oldId: number | null) {

        let originalParameters = modifierWithParameters;
        if (oldId != null) {
            const oldRunningItem = this.getById(oldId);
            //A task can be replaced by another one that is why the original state is required
            originalParameters = oldRunningItem.modifier;
            const pending = this.deleteByIdAndGetPendingModifier(oldId);
            if (pending != null) {
                throw new Error("Replaced modifier cannot have a pending one");
            }
        }
        const newItem: RunningModifier<TComponent> = {
            id: id,
            modifier: modifierWithParameters,
            promise: promise,
            next: null,
            originalParameters: originalParameters
        };

        this._storage.push(newItem);
        return newItem;
    }

    public exists(id: number) {
        return this._storage.findIndex(i => i.id === id) >= 0;
    }

    public discardAll() {
        this._storage.length = 0;
        this._lockQueue.length = 0;
    }

    public getById(id: number): RunningModifier<TComponent> {
        const oldItemIndex = this._storage.findIndex(i => i.id === id);
        if (oldItemIndex >= 0) {
            return  this._storage[oldItemIndex];
        }
        throw new Error("Could not find a running task by its id");
    }

    public deleteByIdAndGetPendingModifier(id: number): ModifierWithParameters<TComponent, any> | null {

        let result: ModifierWithParameters<TComponent, any> | null = null;

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

    private getByModifierId(modifier: ModifierWithParameters<TComponent, any>): RunningModifier<TComponent> | null {
        const index = this._storage.findIndex(i => i.modifier.mod === modifier.mod);
        return index < 0 ? null : this._storage[index];
    }

    private putIntoLockQueue(modifier: ModifierWithParameters<TComponent, any>): boolean {
        const targetLocks = modifier.mod.asyncData.locks;
        if (targetLocks == null || targetLocks.length < 1) {
            return false;
        }

        for (const ri of this._storage) {
            if (ri.modifier.mod.asyncData.locks != null && ri.modifier.mod.asyncData.locks.length > 0) {
                if (RunningPool.locksIntersect(ri.modifier, modifier)) {
                    this._lockQueue.push(modifier);
                    return true;
                }
            }
        }
        return false;
    }

    private extractFromLockQueue(): ModifierWithParameters<TComponent, any> | null {
        if (this._lockQueue.length < 1) {
            return null;
        }
        let index = 0;
        if (this._storage.length > 0) {
            index = this._lockQueue.findIndex(lq => !this._storage.some(s => RunningPool.locksIntersect(s.modifier, lq)));
        }
        let res: ModifierWithParameters<TComponent, any> | null = null;
        if (index >= 0) {
            res = this._lockQueue[index];
            this._lockQueue.splice(index, 1);
        }
        return res;
    }

    private static locksIntersect<TComponent>(x: ModifierWithParameters<TComponent, any>, y: ModifierWithParameters<TComponent, any>): boolean {
        const xL = x.mod.asyncData.locks;
        const yL = y.mod.asyncData.locks;

        if (xL == null || xL.length < 1 || yL == null || yL.length < 1) {
            return false;
        }
        return xL.some(xLi => yL.some(yLi => yLi === xLi));
    }
}
