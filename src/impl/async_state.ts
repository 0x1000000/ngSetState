import { RunningPool } from "./running_pool";
import { AsyncModifier, ASYNC_STATE, ConComponent } from './domain';
import { IStateHolder } from './../api/i_with_state';
import { checkPromise, delayMs } from './utils';
import { AsyncContext } from "../api/common";

export class AsyncState<TState> {

    constructor(private readonly _component: IStateHolder<TState>) { }

    private readonly _pool = new RunningPool<TState>();
    
    public static pushModifiers<TState>(component: IStateHolder<TState>, modifiers: AsyncModifier<TState>[], previousState: TState, diff: Partial<TState>) {
        const instance = AsyncState.ensureComponentAsyncState<TState>(component);
        instance.pushModifiers(modifiers, previousState, diff);
    }

    public static async whenAll<TState>(stateHolder: IStateHolder<TState>): Promise<any> {

        if (stateHolder && !stateHolder[ASYNC_STATE]) {
            return;
        }
        const asyncState = AsyncState.ensureComponentAsyncState(stateHolder);

        while (true) {
            var arr = asyncState._pool.getAllPromises();

            if (arr.length === 0) {
                return;
            }

            await Promise.all(arr);
        }
    }

    public static discardAll<TState>(stateHolder: IStateHolder<TState>) {
        if (stateHolder && !stateHolder[ASYNC_STATE]) {
            return;
        }
        const asyncState = AsyncState.ensureComponentAsyncState(stateHolder);
        asyncState._pool.discardAll();
    }

    private pushModifiers(modifiers: AsyncModifier<TState>[], previousState: TState, diff: Partial<TState>) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                if (mod.asyncData.predicate == null || mod.asyncData.predicate(this._component.state)) {
                    this.registerAndLaunchModifier(mod, previousState, diff);
                }
            }
        }
    }

    private registerAndLaunchModifier(mod: AsyncModifier<TState>, previousState: TState, diff: Partial<TState>): void {
        const ids = this._pool.nextOrCurrentId(mod);

        if (ids == null) {
            return;
        }
        const [id, oldId] = ids;

        //A task can be replaced by another one that is why the original state is required
        let originalState = previousState;
        let originalDiff = diff;

        if (oldId != null) {
            const oldRunning = this._pool.getById(oldId);
            originalState = oldRunning.originalState;
            originalDiff = oldRunning.originalDiff;
        }

        const promise = (async () => {
            let finalized: boolean = false;
            try {

                const res = mod(this.createAsyncContext(id), originalState, originalDiff);
                if (!checkPromise(res)) {
                    throw new Error("Async modifier should return a promise");
                }
                let asyncDiff: Partial<TState> | null = null;

                try {
                    //Running async modifier
                    asyncDiff = await res;
                } catch (error) {
                    asyncDiff = null;
                    if (mod.asyncData.behaviourOnError === "forget") {
                    } else if (mod.asyncData.behaviourOnError === "throw") {
                        throw error;
                    } else if (mod.asyncData.behaviourOnError.callMethod != null) {
                        if (this._pool.exists(id)) { //if was not replaced
                            const errorDiff = mod.asyncData.behaviourOnError.callMethod(this._component.state, error);
                            if (errorDiff != null) {
                                this._component.modifyStateDiff(errorDiff);
                            }
                        }
                    } else {
                        throw new Error("Unknown error behaviour: " + mod.asyncData.behaviourOnError);
                    }
                }

                if (this._pool.exists(id)) {//if was not replaced
                    if (mod.asyncData.finalizer != null) {
                        const finalDiff = mod.asyncData.finalizer();
                        if (finalDiff != null) {
                            asyncDiff = asyncDiff == null ? finalDiff : Object.assign(asyncDiff, finalDiff);
                        }
                    }
                    if (asyncDiff != null) {
                        this._component.modifyStateDiff(asyncDiff);
                        finalized = true;
                    }
                }

            } finally {

                if (mod.asyncData.finalizer != null && !finalized && this._pool.exists(id)) { //if was not replaced
                    const finalDiff = mod.asyncData.finalizer();
                    if (finalDiff != null) {
                        this._component.modifyStateDiff(finalDiff);
                    }
                }
                const pending = this._pool.deleteByIdAndGetPendingModifier(id);
                if (pending != null) {
                    this.registerAndLaunchModifier(pending, previousState, diff);
                }
            }
        })();

        this._pool.addNewAndDeleteOld(id, promise, mod, oldId, originalState, originalDiff);
    }

    private createAsyncContext(id: number): AsyncContext<TState> & ConComponent<TState> {

        const result = (() => this._component.state) as AsyncContext<TState> & ConComponent<TState>;

        result.isCancelled = () => !this._pool.exists(id);

        result.getComponent = () => this._component;

        return result;
    }

    private static ensureComponentAsyncState<TState>(component: IStateHolder<TState>): AsyncState<TState> {
        if (component == null) {
            throw new Error("Component should be initialized");
        }

        if (component[ASYNC_STATE]) {
            return component[ASYNC_STATE];
        }

        const asyncState: AsyncState<TState> = new AsyncState<TState>(component);

        component[ASYNC_STATE] = asyncState;

        return asyncState;
    }
}