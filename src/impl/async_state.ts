import { RunningPool } from "./running_pool";
import { AsyncActionModifier, AsyncModifier, ASYNC_STATE, ConComponent, isAsyncActionModifierWithParameters, ModifierWithParameters } from './domain';
import { checkPromise } from './utils';
import { AsyncContext } from "../api/common";
import { IStateHolder } from "./../api/i_with_state";
import { ComponentState, ComponentStateDiff, StateDiff } from "./../api/state_tracking";
import { Functions } from "./functions";

export class AsyncState<TComponent> {

    constructor(private readonly _component: IStateHolder<TComponent>) { }

    private readonly _pool = new RunningPool<TComponent>();
    
    public static pushModifiers<TComponent>(component: IStateHolder<TComponent>, modifiers: AsyncModifier<TComponent>[], previousState: ComponentState<TComponent>, diff: ComponentStateDiff<TComponent>) {
        const instance = AsyncState.ensureComponentAsyncState<TComponent>(component);
        instance.pushModifiers(modifiers, previousState, diff);
    }

    public static pushActionModifiers<TComponent, TA>(component: IStateHolder<TComponent>, modifiers: AsyncActionModifier<TComponent, TA>[], action: TA) {
        const instance = AsyncState.ensureComponentAsyncState<TComponent>(component);
        instance.pushActionModifiers(modifiers, action);
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

    private pushModifiers(modifiers: AsyncModifier<TComponent>[], previousState: ComponentState<TComponent>, diff: ComponentStateDiff<TComponent>) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                if (mod.asyncData.predicate == null || mod.asyncData.predicate(this._component.state)) {
                    this.registerAndLaunchModifier({mod, previousState, diff});
                }
            }
        }
    }

    private pushActionModifiers<TA>(modifiers: AsyncActionModifier<TComponent, TA>[], action: TA) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                if (mod.asyncData.predicate == null || mod.asyncData.predicate(this._component.state)) {
                    this.registerAndLaunchModifier({mod, action});
                }
            }
        }
    }

    private registerAndLaunchModifier(modifierWithParameters: ModifierWithParameters<TComponent, any>): void {
        const ids = this._pool.nextOrCurrentId(modifierWithParameters);

        if (ids == null) {
            return;
        }
        const [id, oldId] = ids;

        //A task can be replaced by another one that is why the original state is required
        let effectiveParameters = modifierWithParameters;

        if (oldId != null) {
            const oldRunning = this._pool.getById(oldId);
            if (!isAsyncActionModifierWithParameters(oldRunning.originalParameters)) {
                effectiveParameters = oldRunning.originalParameters;
            }            
        }

        const promise = (async () => {
            let finalized: boolean = false;
            try {

                const res = isAsyncActionModifierWithParameters(effectiveParameters)
                    ? effectiveParameters.mod(effectiveParameters.action, this.createAsyncContext(id))
                    : effectiveParameters.mod(this.createAsyncContext(id), effectiveParameters.previousState, effectiveParameters.diff);

                if (!checkPromise(res)) {
                    throw new Error("Async modifier should return a promise");
                }
                let asyncDiff: StateDiff<TComponent> = null;

                try {
                    //Running async modifier
                    asyncDiff = await res;
                } catch (error) {
                    asyncDiff = null;
                    if (effectiveParameters.mod.asyncData.behaviorOnError === "forget") {
                    } else if (effectiveParameters.mod.asyncData.behaviorOnError === "throw") {
                        throw error;
                    } else if (effectiveParameters.mod.asyncData.behaviorOnError.callMethod != null) {
                        if (this._pool.exists(id)) { //if was not replaced
                            const errorDiff = effectiveParameters.mod.asyncData.behaviorOnError.callMethod(this._component.state, error);
                            if (errorDiff != null) {
                                this._component.modifyStateDiff(errorDiff);
                            }
                        }
                    } else {
                        throw new Error("Unknown error behavior: " + effectiveParameters.mod.asyncData.behaviorOnError);
                    }
                }

                if (this._pool.exists(id)) {//if was not replaced
                    if (effectiveParameters.mod.asyncData.finalizer != null) {
                        const finalDiff = effectiveParameters.mod.asyncData.finalizer();
                        if (finalDiff != null) {
                            asyncDiff = asyncDiff == null ? finalDiff : Functions.accStateDiff(asyncDiff, finalDiff);
                        }
                    }
                    if (asyncDiff != null) {
                        this._component.modifyStateDiff(asyncDiff);
                        finalized = true;
                    }
                }

            } finally {

                if (effectiveParameters.mod.asyncData.finalizer != null && !finalized && this._pool.exists(id)) { //if was not replaced
                    const finalDiff = effectiveParameters.mod.asyncData.finalizer();
                    if (finalDiff != null) {
                        this._component.modifyStateDiff(finalDiff);
                    }
                }
                const pending = this._pool.deleteByIdAndGetPendingModifier(id);
                if (pending != null) {
                    this.registerAndLaunchModifier(pending);
                }
            }
        })();

        this._pool.addNewAndDeleteOld(id, promise, effectiveParameters, oldId);
    }

    private createAsyncContext(id: number): AsyncContext<TComponent> & ConComponent<TComponent> {

        const result = (() => this._component.state) as AsyncContext<TComponent> & ConComponent<TComponent>;

        result.isCancelled = () => !this._pool.exists(id);

        result.getComponent = () => this._component;

        return result;
    }

    private static ensureComponentAsyncState<TComponent>(component: IStateHolder<TComponent>): AsyncState<TComponent> {
        if (component == null) {
            throw new Error("Component should be initialized");
        }

        if (component[ASYNC_STATE]) {
            return component[ASYNC_STATE];
        }

        const asyncState: AsyncState<TComponent> = new AsyncState<TComponent>(component);

        component[ASYNC_STATE] = asyncState;

        return asyncState;
    }
}