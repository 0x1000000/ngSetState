import { RunningPool } from "./running_pool";
import { AsyncModifier, ASYNC_STATE } from './domain';
import { IWithState } from './../api/i_with_state';
import { checkPromise } from './utils';
import { AsyncContext } from "../api/common";

export class AsyncState<TState> {

    constructor(private readonly _component: IWithState<TState>) { }

    private readonly _pool = new RunningPool<TState>();
    
    public static pushModifiers<TState>(component: IWithState<TState>, modifiers: AsyncModifier<TState>[], previousState: TState, diff: Partial<TState>) {
        const instance = AsyncState.ensureComponentAsyncState<TState>(component);
        instance.pushModifiers(modifiers, previousState, diff);
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

    private pushModifiers(modifiers: AsyncModifier<TState>[], previousState: TState, diff: Partial<TState>) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                this.registerAndLaunchModifier(mod, previousState, diff);
            }
        }
    }

    private registerAndLaunchModifier(mod: AsyncModifier<TState>, previousState: TState, diff: Partial<TState>): void {
        const ids = this._pool.nextOrCurrentId(mod);

        if (ids == null) {
            return;
        }
        const [id, oldId] = ids;
       
        const promise = (async () => {
            try {

                const res = mod(this.createAsyncContext(id), previousState, diff);
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

                if (this._pool.exists(id) && asyncDiff != null) {//if was not replaced
                    this._component.modifyStateDiff(asyncDiff);
                }

            } finally {
                const pending = this._pool.deleteByIdAndGetPendingModifier(id);
                if (pending != null) {
                    this.registerAndLaunchModifier(pending, previousState, diff);
                }
            }
        })();

        this._pool.addNewAndDeleteOld(id, promise, mod, oldId, previousState, diff);
    }

    private createAsyncContext(id: number): AsyncContext<TState> {

        const result = (() => this._component.state) as AsyncContext<TState>;

        result.isCancelled = () => !this._pool.exists(id);

        return result;
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