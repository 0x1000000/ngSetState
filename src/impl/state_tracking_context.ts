import { EventEmitter } from '@angular/core';
import { Functions } from '../impl/functions';
import { AsyncState } from '../impl/async_state';
import { StateMeta } from './domain';
import { IStateHolder } from '../api/i_with_state';
import { EMITTER_SUFFIX } from './domain';
import { cmpByProp, cmp } from './utils';
import { StateTrackingOptions, ComponentState, ComponentStateDiff, ISharedStateChangeSubscription, IStateHandler } from '../api/state_tracking';

type PropertyKey = keyof any;
type SharedPropMap = { [componentProp: string]: [Object, keyof any] };

interface IStateTrackerSubscriber {
    onStateChange(sharedState: Object, state: Object, previous: Object);
}

interface IStateTrackerRef {
    subscribeTracker(subscriber: IStateTrackerSubscriber);
    releaseTracker(subscriber: IStateTrackerSubscriber);
    getState(): Object;
    release: () => void;
}

export class StateTrackerContext<TComponent> implements IStateHolder<ComponentState<TComponent>> {
    public state: ComponentState<TComponent>;

    private static readonly contextRefPropertyId: symbol = Symbol();

    private _callbackIsScheduled: boolean = false;

    private _changesBuffer: Partial<ComponentState<TComponent>> | null;

    private readonly _emittersDict: { [k: string]: EventEmitter<any> } = {};

    private readonly _stateMeta: StateMeta<any>;

    private readonly _component: TComponent;

    private readonly _options: StateTrackingOptions<TComponent>;

    private readonly _sharedState: Object | Object[] | null;

    private readonly _sharedStatePropMap: SharedPropMap | null;

    private readonly _subscribers: IStateTrackerSubscriber[] = [];

    private _subscription: ISharedStateChangeSubscription | null = null;

    public static releaseComponent<TComponent>(component: TComponent) {
        const ref: IStateTrackerRef = component[StateTrackerContext.contextRefPropertyId];
        if (!ref) {
            throw new Error("This component was not initialized with a state tracker");
        }
        ref.release();
    }

    constructor(component: TComponent, stateMeta: StateMeta<any>, options: StateTrackingOptions<TComponent> | null |undefined) {

        if (component[StateTrackerContext.contextRefPropertyId]) {
            throw new Error("This component has already been initialized with a state tracker");
        }

        //This Object will be added to the component property as a ref
        const ref: IStateTrackerRef = {
            subscribeTracker: (s) => this._subscribers.push(s),
            releaseTracker: (s) => {
                const sIndex = this._subscribers.indexOf(s);
                if (sIndex < 0) {
                    throw new Error("Could not find subscriber");
                }
                this._subscribers.splice(sIndex, 1);
            },
            getState: () => this.state,
            release: () => this.release()
        };

        component[StateTrackerContext.contextRefPropertyId] = ref;

        this._component = component;
        this._stateMeta = stateMeta;
        this._options = this.ensureDefaultOptions(options);

        const externalState: ComponentStateDiff<TComponent> | null = this._options.getInitialState?.call(component, component);
        this.state = <ComponentState<TComponent>>(externalState ?? <ComponentState<TComponent>>{});

        //adds to state all props mentioned as modifier dependencies
        const props = this._stateMeta.modifiers.map(m => m.prop);
        // adds explicitly defined properties
        props.push(...this._stateMeta.explicitStateProps.filter(e => props.indexOf(e) < 0));

        //finds EventEmitters
        for (const key of Object.keys(this._component)) {
            const value = component[key];
            if (value !== undefined) {               
                if (externalState != null && externalState === value) {
                    continue;
                }
                if (value instanceof EventEmitter) {
                    if (stateMeta.emitterMaps[key]) {
                        const eKey = stateMeta.emitterMaps[key] as string;
                        if (!this._emittersDict[eKey]) {
                            this._emittersDict[eKey] = value;
                        }
                    } else if (key.endsWith(EMITTER_SUFFIX)) {
                        const eKey = key.substr(0, key.length - EMITTER_SUFFIX.length);

                        if (!this._emittersDict[eKey]) {
                            this._emittersDict[eKey] = value;
                        }
                    }
                }
                else if (this._options.includeAllPredefinedFields && props.indexOf(key) < 0) {
                    props.push(key);
                }
            }
        }

        //extends with external state properties
        if (externalState != null) {
            for (const key of Object.keys(this.state)) {
                if ((component as Object).hasOwnProperty(key)) {
                    if (props.indexOf(key) < 0) {
                        props.push(key);
                    }
                }
            }
        }

        //Replacing with getters and setters
        for (const e of props) {
            this.replaceMember(e, externalState == null);
        }

        //Replacing with getters and setters with pointing to a shared state
        this._sharedState = this._options.getSharedStateTracker?.call(component, component);
        this._sharedStatePropMap = this.connectToSharedTrackers();

        //Constructing stateTrackerHandler
        this._options.setHandler?.call(component, component, buildHandler(this));

        function buildHandler(context: StateTrackerContext<ComponentState<TComponent>>): IStateHandler<ComponentState<TComponent>> {
            return {
                getState: () => context.getState(),
                modifyStateDiff: (diff) => context.modifyStateDiff(diff),
                subscribeSharedStateChange: () => context.subscribeSharedStateChange(),
                whenAll: () => context.whenAll(),
                release: () => context.release()
            }
        }

        //Push async init
        if (stateMeta.asyncInit != null) {
            const init = stateMeta.asyncInit;
            setTimeout(() => AsyncState.pushModifiers(this, [init], this.state, {}));
        }
    }

    //It is called from constructor just to reduce its size
    private connectToSharedTrackers(): SharedPropMap| null {
        if (this._sharedState == null) {
            return null;
        }
        const sharedStatePropMap = {};
        const sharedPropsWatchDog = new Set<keyof any>();
        const sharedTrackers = this.ensureArray(this._sharedState);
        const nameCollisionWatchDog = sharedTrackers.length > 1 ? new Set<string>() : null;
        for (let i = 0; i < sharedTrackers.length; i++) {
            const sharedTracker = sharedTrackers[i];
            const bindings = Object.keys(this._stateMeta.sharedBindings);

            if (bindings.length < 0) {
                throw new Error("The component shares a state tracker and it should have at least one binding to it.");
            }

            if (!sharedTracker[StateTrackerContext.contextRefPropertyId] || this === sharedTracker) {
                throw new Error("Only other state trackers can be specified as a shared state tracker");
            }

            for (const bindingProp of bindings) {

                const sharedBinding = this._stateMeta.sharedBindings[bindingProp];
                const sharedBindingProp = Array.isArray(sharedBinding)
                    ? sharedBinding[1] == null || sharedBinding[1] === i
                        ? sharedBinding[0]
                        : null
                    : sharedBinding;

                if (sharedBindingProp == null && sharedBinding[1] >= sharedTrackers.length) {
                    throw new Error(`The index ${sharedBinding[1]} in  ${bindingProp}=> ${sharedBinding[0]} is out of the range`);
                }

                if (sharedBindingProp != null) {
                    sharedPropsWatchDog.add(sharedBindingProp);
                }

                if (sharedBindingProp != null && this.checkIsSetter(sharedTracker, sharedBindingProp)) {

                    sharedPropsWatchDog.delete(sharedBindingProp);

                    if (nameCollisionWatchDog?.has(bindingProp)) {
                        throw new Error(`Field name collision detected in shared state tarackes ("${bindingProp}"  to "${sharedBindingProp.toString()}"). You need to specify an index of a desired state tracker.`);
                    }
                    nameCollisionWatchDog?.add(bindingProp);

                    sharedStatePropMap[bindingProp as any] = [sharedTracker, sharedBindingProp];

                    this.replaceSharedMember(bindingProp, sharedBindingProp, sharedTracker);
                }
            }
        }

        if (sharedPropsWatchDog.size > 0) {
            const fields = Array.from(sharedPropsWatchDog).join(",");
            throw new Error(`Could not find "${fields}" field(s) in the shared state tarcker. Make sure it is included in to the state.`);
        }

        return sharedStatePropMap;
    }

    public modifyStateDiff(diff: Partial<ComponentState<TComponent>> | null): boolean {
        if (diff == null) {
            return false;
        }

        let previousState = this.state;

        const { newState, asyncModifiers, emitterProps: alwaysEmittedProps } = Functions.updateCycle(this._stateMeta, previousState, diff, true);

        this.state = newState;

        const result = this.state !== previousState;

        //Add missing getters and setters if a prop returned by a modifier
        const newStateKeys = Object.keys(newState);
        for (const p of newStateKeys) { 
            if (Object.getOwnPropertyDescriptor(this._component, p)?.get == null) {
                if (!(this._component[p] instanceof EventEmitter)) {
                    this.replaceMember(p, false);
                }
            }

            //Copy to shared state
            if (this._sharedState != null) {
                const sharedProp = this._sharedStatePropMap![p as any];
                if (sharedProp != null) {
                    const desc = Object.getOwnPropertyDescriptor(sharedProp[0], sharedProp[1]);
                    if (desc != null && desc.set != null && !cmpByProp(previousState,newState,p)) {
                        desc.set.call(sharedProp[0], newState[p]);
                    }
                }
            }

        }
        //Emit outputs
        if (result || alwaysEmittedProps != null) {
            for (const emitterProp of Object.keys(this._emittersDict)) {

                let checkAlwaysEmittedProps = true;
                if (result) {
                    if (!cmpByProp(newState, previousState, emitterProp)) {
                        this._emittersDict[emitterProp].emit(newState[emitterProp]);
                        checkAlwaysEmittedProps = false;
                    }
                }

                if (alwaysEmittedProps != null && checkAlwaysEmittedProps) {
                    if (alwaysEmittedProps.indexOf(emitterProp) >= 0) {
                        this._emittersDict[emitterProp].emit(newState[emitterProp]);
                    }
                }
            }
        }

        if (result && this._options.onStateApplied != null) {
            this._options.onStateApplied.call(this._component, this._component, this.state, previousState);
        }

        if (asyncModifiers && asyncModifiers.length > 0) {
            AsyncState.pushModifiers(this, asyncModifiers, previousState, diff);
        }

        if (this._subscribers.length > 0 && result) {
            for (const subscriber of this._subscribers) {
                subscriber.onStateChange(this._component, this.state, previousState);
            }
        }

        return result;
    }

    public getState(): ComponentState<TComponent> {
        return this.state;
    }

    private replaceMember(prop: PropertyKey, copyValue: boolean) {
        if (copyValue && this._component[prop] !== undefined) {
            this.state[prop] = this._component[prop];
        }

        Object.defineProperty(this._component,
            prop,
            {
                get: () => {
                    if (!this._options.immediateEvaluation && this._changesBuffer != null && (this._changesBuffer as Object).hasOwnProperty(prop)) {
                        return this._changesBuffer[prop];
                    }
                    return this.state[prop];
                },
                set: (val) => {
                    this.onModification(prop, val);
                },
                enumerable: true,
                configurable: true//If property was not defined before it would not "configurable"
            });
    }

    private replaceSharedMember(prop: PropertyKey, sharedProp: PropertyKey, sharedState: Object) {

        const existingDescriptor = Object.getOwnPropertyDescriptor(this._component, prop);

        Object.defineProperty(this._component,
            prop,
            {
                get: () => {
                    return sharedState[sharedProp];
                },
                set: (val) => {
                    if (existingDescriptor?.set) {
                        //It is required to sync shared and local if there is no subscription.
                        //for proper modifiers selection
                        this.syncStateWithShared(sharedProp);

                        existingDescriptor.set.call(this, val);
                    } else {//modifyStateDiff will update it
                        sharedState[sharedProp] = val;
                    }
                },
                enumerable: true
            });
    }

    private syncStateWithShared(sharedState: Object) {
        if (!this._sharedStatePropMap) {
            throw new Error("Shared state prop map should be set");
        }
        const mappedComponentProps = Object.keys(this._sharedStatePropMap);

        let diff: Object | null = null;//Difference between local and shared states 

        for (const componentProp of mappedComponentProps) {
            const m = this._sharedStatePropMap[componentProp];
            if (m[0] === sharedState) {
                const sharedProp = m[1];
                const sharedValue = sharedState[sharedProp];
                if (!cmp(this.state[componentProp], sharedValue)) {
                    if (diff == null) {
                        diff = {};
                    }
                    diff[componentProp] = sharedValue;
                }
            }
        }

        if (diff != null) {
            this.state = Object.assign({}, this.state, diff);
            Object.freeze(this.state);
        }
    }

    private onModification(prop: PropertyKey, value: any) {
        if (this._options.immediateEvaluation) {
            const diff = {};
            diff[prop] = value;
            this.modifyStateDiff(diff);
        } else {
            if (this._changesBuffer == null) {
                this._changesBuffer = {};
            }
            this._changesBuffer[prop] = value;
            this.scheduleCallback();
        }
    }

    private scheduleCallback() {
        if (!this._callbackIsScheduled) {
            this._callbackIsScheduled = true;
            setTimeout(() => {
                this._callbackIsScheduled = false;
                const cb = this._changesBuffer;
                this._changesBuffer = null;
                this.modifyStateDiff(cb);
            });
        }
    }

    public subscribeSharedStateChange(): ISharedStateChangeSubscription | null {
        if (this._sharedState == null) {
            return null;
        }

        if (this._subscription != null) {
            throw new Error("State tracker has already been subscribed to shared state changes");
        }

        const refs: IStateTrackerRef[] = this.ensureArray(this._sharedState).map(ss => ss[StateTrackerContext.contextRefPropertyId]) ;

        const subscribers: IStateTrackerSubscriber[] = [];
        for (const ref of refs) {
            const subscriber = { onStateChange: (t, s, p) => this.onSharedStateChanged(t, s, p) };
            ref.subscribeTracker(subscriber);
            subscribers.push(subscriber);
        }

        this._subscription = {} as ISharedStateChangeSubscription;

        this._subscription.unsubscribe = () => {
            refs.forEach((ref, i) => ref.releaseTracker(subscribers[i]));
            this._subscription = null;
        };

        return this._subscription;
    }

    public release() {
        AsyncState.discardAll(this);

        if (this._subscription != null) {
            this._subscription.unsubscribe();
            this._subscription = null;
        }
    }

    public whenAll(): Promise<any> {
        return AsyncState.whenAll(this);
    }

    private onSharedStateChanged(sharedStateComponent: Object, newState: Object, previous: Object) {
        if (!this._sharedStatePropMap) {
            throw new Error("Shared state prop map should be set");
        }
        const mappedComponentProps = Object.keys(this._sharedStatePropMap);

        let diff: Object | null = null;//Difference between local and shared states 
        let sharedPrevDiff: Object | null = null;//Difference between old and new shared states 

        for (const componentProp of mappedComponentProps) {
            const m = this._sharedStatePropMap[componentProp];

            if (m[0] === sharedStateComponent) {
                const sharedProp = m[1];
                const sharedPrevValue = previous[sharedProp];
                const sharedCurrentValue = newState[sharedProp];
                if (!cmp(this.state[componentProp], sharedPrevValue)) {
                    if (diff == null) {
                        diff = {};
                    }
                    diff[componentProp] = sharedPrevValue;
                }

                if (!cmp(sharedPrevValue, sharedCurrentValue)) {
                    if (sharedPrevDiff == null) {
                        sharedPrevDiff = {};
                    }
                    sharedPrevDiff[componentProp] = sharedCurrentValue;
                }
            }
        }

        if (sharedPrevDiff == null) {
            return;
        }

        this.state = Object.assign({}, this.state, diff);
        Object.freeze(this.state);
        this.modifyStateDiff(sharedPrevDiff as any);
    }

    private ensureDefaultOptions(options: StateTrackingOptions<TComponent> | null | undefined)
        : StateTrackingOptions<TComponent>
    {
        const res: Required<StateTrackingOptions<TComponent>> = {
            immediateEvaluation: options?.immediateEvaluation ?? false,
            includeAllPredefinedFields: options?.includeAllPredefinedFields ?? false,
            onStateApplied: options?.onStateApplied ?? null,
            getInitialState: options?.getInitialState ?? null,
            setHandler: options?.setHandler ?? null,
            getSharedStateTracker: options?.getSharedStateTracker ?? null
        };

        return res;
    }

    private checkIsSetter<T>(obj: T, prop: keyof any) {
        return Object.getOwnPropertyDescriptor(obj, prop)?.set != null;
    }

    private ensureArray<T>(obj: T | T[]): T[] {
        return Array.isArray(obj) ? obj : [obj];
    }
}