import { RunningPool } from "./running_pool";
import { AsyncModifier, ASYNC_STATE } from './domain';
import { IWithState } from './../api/i_with_state';
import { checkPromise } from './utils';

export class AsyncState<TState> {

    constructor(private readonly _component: IWithState<TState>) { }

    private readonly _pool = new RunningPool<TState>();
    
    public static pushModifiers<TState>(component: IWithState<TState>, modifiers: AsyncModifier<TState>[], previousState: TState) {
        const instance = AsyncState.ensureComponentAsyncState<TState>(component);
        instance.pushModifiers(modifiers, previousState);
    }

    public static async whenAll<TState>(component: IWithState<TState>): Promise<any> {
        if (!component[ASYNC_STATE]) {
            return;
        }
        const asyncState = AsyncState.ensureComponentAsyncState(component);

        while (true) {
            var arr = asyncState._pool.getAllPromises();

            if (arr.length === 0) {
                return;
            }
            await Promise.all(arr);
        }
    }

    private pushModifiers(modifiers: AsyncModifier<TState>[], previousState: TState) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                this.registerAndLaunchModifier(mod, previousState);
            }
        }
    }

    private registerAndLaunchModifier(mod: AsyncModifier<TState>, previousState: TState): void {
        const ids = this._pool.nextOrCurrentId(mod);

        if (ids == null) {
            return;
        }
        const [id, oldId] = ids;

        //A task can be replaced by another one that is why the original state is required
        const originalState = oldId != null ? this._pool.getById(oldId).originalState : previousState;
        
        const promise = (async () => {
            try {

                const res = mod(() => this._component.state, originalState);
                if (!checkPromise(res)) {
                    throw new Error("Async modifier should return a promise");
                }
                let diff: Partial<TState> | null = null;

                try {
                    //Running async modifier
                    diff = await res;
                } catch (error) {
                    diff = null;
                    if (mod.asyncData.behaviourOnError === "forget") {
                    }
                    else if (mod.asyncData.behaviourOnError === "throw") {
                        throw error;
                    }
                    else if (mod.asyncData.behaviourOnError.callMethod != null) {
                        const errorDiff = mod.asyncData.behaviourOnError.callMethod(this._component.state, error);
                        if (errorDiff != null) {
                            this._component.modifyStateDiff(errorDiff);
                        }
                    }
                    else {
                        throw new Error("Unknown error behaviour: " + mod.asyncData.behaviourOnError);
                    }
                }

                if (this._pool.exists(id) && diff != null) {//if was not replaced
                    this._component.modifyStateDiff(diff);
                }

            } finally {
                const pending = this._pool.deleteByIdAndGetPendingModifier(id);
                if (pending != null) {
                    this.registerAndLaunchModifier(pending, previousState);
                }
            }
        })();

        this._pool.addNewAndDeleteOld(id, promise, mod, oldId, originalState);
    }

    private static ensureComponentAsyncState<TState>(component: IWithState<TState>): AsyncState<TState> {
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