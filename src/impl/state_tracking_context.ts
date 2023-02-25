import { Functions } from '../impl/functions';
import { AsyncState } from '../impl/async_state';
import { StateMeta, Modifier, isAsyncModifier } from './domain';
import { EMITTER_SUFFIX } from './domain';
import { cmpByProp, cmp, checkIsEventEmitterLike, checkIsObservableLike, checkIsSubjectLike } from './utils';
import { StateTrackingOptions, ComponentState, ComponentStateDiff, ISharedStateChangeSubscription, IStateHandler } from '../api/state_tracking';
import { EventEmitterLike, SubscriptionLike, SubjectLike, ObservableLike } from './../api/common';
import { IStateHolder } from './../api/i_with_state';
import { WithSharedAsSourceArg } from './../api/state_decorators/with_shared_as_source';
import { WithSharedAsTargetArg } from './../api/state_decorators/with_shared_as_target';

type PropertyKey = keyof any;

type SharedPropMap<TComponent> = {
    [componentProp in keyof ComponentStateDiff<TComponent>]?: [sharedComponent: Object, sharedComponentProperty: keyof any];
};

interface IStateTrackerSubscriber {
    onStateChange(sharedState: Object, state: Object, previous: Object);
}

interface IStateTrackerRef {
    subscribeTracker(subscriber: IStateTrackerSubscriber);
    releaseTracker(subscriber: IStateTrackerSubscriber);
    getState(): Object;
    release: () => void;
    getHandler: () => IStateHandler<any>;
}

class StateTrackerEventQueue {
    private readonly _queue: { component: any, callback: () => void }[] = [];

    private _counter: number = 0;

    public initUpdating(): void {
        this._counter++;
    }

    public add(component: any, callback: () => void): void {
        const index = this._queue.findIndex(i => i.component === component);
        if (index >= 0) {
            this._queue.splice(index, 1);
        }
        this._queue.push({ component, callback });
    }

    public releaseUpdating(): void {
        this._counter--;
        if (this._counter < 0) {
            this._counter = 0;
        }

        if (this._counter === 0) {
            if (this._queue.length > 0) {
                const copy = [...this._queue];
                this._queue.length = 0;
                for (const i of copy) {
                    i.callback();//Callback might affect queue
                }
            }
        }
    }
}

export class StateTrackerContext<TComponent extends Object> implements IStateHolder<TComponent> {
    public state: ComponentState<TComponent>;

    private static readonly contextRefPropertyId: symbol = Symbol();

    private static readonly notifyQueue = new StateTrackerEventQueue();

    private readonly _emittersDict: { [k in keyof TComponent]?: EventEmitterLike<any> | SubjectLike<any> } = {};

    private readonly _stateMeta: StateMeta<any>;

    private readonly _component: TComponent;

    private readonly _options: StateTrackingOptions<TComponent>;

    private readonly _sharedComponents: Object | Object[] | null;

    private readonly _sharedComponentPropBindingMap: SharedPropMap<TComponent> | null;

    private readonly _subscribers: IStateTrackerSubscriber[] = [];

    private _callbackIsScheduled: boolean = false;

    private _changesBuffer: ComponentStateDiff<TComponent> | null;

    private _subscription: ISharedStateChangeSubscription | null = null;

    public _observableSubscriptions: SubscriptionLike[] | null = null; 

    public static releaseComponent<TComponent>(component: TComponent) {
        const ref: IStateTrackerRef = component[StateTrackerContext.contextRefPropertyId];
        if (!ref) {
            throw new Error("This component was not initialized with a state tracker");
        }
        ref.release();
    }

    public static tryGetStateHandler<TComponent>(component: TComponent): IStateHandler<TComponent> | undefined {
        const trackerRef: IStateTrackerRef = component[StateTrackerContext.contextRefPropertyId];

        if(trackerRef != null && typeof trackerRef.getHandler === 'function') {
            return trackerRef.getHandler();
        }
        return undefined;
    }

    constructor(component: TComponent, stateMeta: StateMeta<TComponent>, options: StateTrackingOptions<TComponent> | null | undefined) {

        if (component[StateTrackerContext.contextRefPropertyId]) {
            throw new Error("This component has already been initialized with a state tracker");
        }

        const handler: IStateHandler<TComponent> = buildHandler(this);       
        Object.freeze(handler);

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
            release: () => this.release(),
            getHandler: () => handler
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
        props.push(...this._stateMeta.sharedSourceMappers.map(x => x.prop as any).filter(e => props.indexOf(e) < 0));
        props.push(...this._stateMeta.sharedTargetMappers.map(x => x.prop as any).filter(e => props.indexOf(e) < 0));

        //finds EventEmitters, Subjects and predefined props
        for (const key of Object.keys(this._component)) {
            const value = component[key];
            if (value !== undefined) {               
                if (externalState != null && externalState === value) {
                    continue;
                }
                if (checkIsEventEmitterLike(value) || checkIsSubjectLike<any>(value)) {
                    if (stateMeta.emitterMaps[key]) {
                        const refKey = stateMeta.emitterMaps[key] as string;
                        if (!this._emittersDict[refKey]) {
                            this._emittersDict[refKey] = value;
                        }
                    } else if (key.endsWith(EMITTER_SUFFIX)) {
                        const eKey = key.substr(0, key.length - EMITTER_SUFFIX.length);

                        if (!this._emittersDict[eKey]) {
                            this._emittersDict[eKey] = value;
                        }
                    } else if (!this._emittersDict[key]) {
                        this._emittersDict[key] = value;
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
        let observables: [(string|number|symbol),ObservableLike<any>][] | undefined;
        for (const e of props) {
            const fieldValue = component[e];
            if(checkIsObservableLike(fieldValue)) {
                if(observables == null) {
                    observables = [];
                }
                observables.push([e, fieldValue]);
            } else {
                this.replaceMember(e, externalState == null);
            }            
        }

        //Might be called immediately and modify state so it is at the end of constrictor (before binding to shared)
        if(observables != null) {
            if (this._observableSubscriptions == null) {
                this._observableSubscriptions = [];
            }
            for(const [key,o] of observables) {
                const subscription = o.subscribe(v => {
                    const newState = {};
                    newState[key] = v;
                    this.modifyStateDiff(newState);
                });
                this._observableSubscriptions.push(subscription);                        
            }
        }       

        //Replacing with getters and setters with pointing to a shared state
        this._sharedComponents = this._options.getSharedStateTracker?.call(component, component);
        this._sharedComponentPropBindingMap = this.connectToSharedTrackers();

        //Constructing stateTrackerHandler
        this._options.setHandler?.call(component, component, handler);

        function buildHandler(context: StateTrackerContext<TComponent>): IStateHandler<TComponent> {
            return {
                getState: () => context.getState(),
                modifyStateDiff: (diff) => context.modifyStateDiff(diff),
                subscribeSharedStateChange: () => context.subscribeSharedStateChange(),
                whenAll: () => context.whenAll(),
                release: () => context.release()
            }
        }

        //Push async init modifier
        if (stateMeta.asyncInit != null) {
            const init = stateMeta.asyncInit;
            setTimeout(() => AsyncState.pushModifiers(this, [init], this.state, {}));
        }
    }

    //It is called from constructor just to reduce its size
    private connectToSharedTrackers(): SharedPropMap<TComponent> | null {
        if (this._sharedComponents == null) {
            return null;
        }
        const resultSharedPropMap: SharedPropMap<TComponent> = {};
        const sharedPropsWatchDog = new Set<keyof any>();
        const sharedComponents = this.ensureArray(this._sharedComponents);
        const nameCollisionWatchDog = sharedComponents.length > 1 ? new Set<string>() : null;
        for (let i = 0; i < sharedComponents.length; i++) {
            const sharedComponent = sharedComponents[i];
            const bindings = Object.keys(this._stateMeta.sharedBindings);

            if (bindings.length < 0) {
                throw new Error("The component shares a state tracker and it should have at least one binding to it.");
            }

            if (!sharedComponent[StateTrackerContext.contextRefPropertyId] || this === sharedComponent) {
                throw new Error("Only other state trackers can be specified as a shared state tracker");
            }

            for (const bindingProp of bindings) {

                const sharedBinding = this._stateMeta.sharedBindings[bindingProp];
                const sharedBindingProp = Array.isArray(sharedBinding)
                    ? sharedBinding[1] == null || sharedBinding[1] === i
                        ? sharedBinding[0]
                        : null
                    : sharedBinding;

                if (sharedBindingProp == null && sharedBinding[1] >= sharedComponents.length) {
                    throw new Error(`The index ${sharedBinding[1]} in  ${bindingProp}=> ${sharedBinding[0]} is out of the range`);
                }

                if (sharedBindingProp != null) {
                    sharedPropsWatchDog.add(sharedBindingProp);
                }

                if (sharedBindingProp != null) {

                    const isSetter = this.checkIsSetter(sharedComponent, sharedBindingProp);
                    const isObservable = checkIsObservableLike(sharedComponent[sharedBindingProp]);

                    if(isSetter || isObservable){
                        sharedPropsWatchDog.delete(sharedBindingProp);

                        if (nameCollisionWatchDog?.has(bindingProp)) {
                            throw new Error(`Field name collision detected in shared state trackers ("${bindingProp}"  to "${sharedBindingProp.toString()}"). You need to specify an index of a desired state tracker.`);
                        }
                        nameCollisionWatchDog?.add(bindingProp);
    
                        resultSharedPropMap[bindingProp as any] = [sharedComponent, sharedBindingProp];
    
                        this.replaceMemberBoundToShared(bindingProp, sharedBindingProp, sharedComponent);    
                    }
                }
            }
        }

        if (sharedPropsWatchDog.size > 0) {
            const fields = Array.from(sharedPropsWatchDog).join(",");
            throw new Error(`Could not find "${fields}" field(s) in the shared state tracker. Make sure it is included in to the state.`);
        }

        return resultSharedPropMap;
    }

    public updateSharedComponentsAfterThisStateChange(newState: ComponentState<TComponent>, oldState: ComponentState<TComponent>, newStateKeys: any[]) {

        if (this._sharedComponents == null || (this._sharedComponentPropBindingMap == null && this._stateMeta.sharedTargetMappers.length < 1)) {
            return;
        }

        const sharedComponents = this.ensureArray(this._sharedComponents);

        let sharedStateChangeAcc: {sharedComponent: Object, diff: Object} [] | undefined;

        let targetMappers: {sharedComponent: Object, fun: (Modifier<any>)[]} [] | undefined;

        for(const p of newStateKeys) {
            //Bound properties
            if (this._sharedComponentPropBindingMap != null && !cmpByProp(oldState, newState, p)) {
                const sharedCompAndProp: [Object, keyof any] = this._sharedComponentPropBindingMap[p];
                if (sharedCompAndProp != null) {
                    const [sharedComponent, sharedProp] = sharedCompAndProp;
                    /*const desc = Object.getOwnPropertyDescriptor(sharedComponent, sharedProp);
                    if (desc != null && desc.set != null && !cmpByProp(previousState, newState, p)) {
                        desc.set.call(sharedComponent, newState[p]);
                    } else */
                    pushToAcc(sharedComponent, sharedProp, newState[p]);
                }
            }

            //AsTarget
            if (this._stateMeta.sharedTargetMappers.length > 0 && !cmpByProp(oldState, newState, p)) {
                for(const sharedMapper of this._stateMeta.sharedTargetMappers) {
                    if(sharedMapper.prop === p) {
                        for(const sharedComponent of sharedComponents) {
                            if(sharedComponent instanceof sharedMapper.sharedType) {
                                pushToTargetMappers(sharedComponent, sharedMapper.fun);
                            }
                        }                        
                    }
                }
            }
        }

        //Invoke target mappers
        if (targetMappers != null) {
            for (const targetMapper of targetMappers) {
                const sharedHandler: IStateHandler<any> = targetMapper.sharedComponent[StateTrackerContext.contextRefPropertyId]?.getHandler();
                if (sharedHandler == null) {
                    throw new Error('Shared component should be initialized with state tracking')
                }
                for (const fun of targetMapper.fun) {
                    const arg: WithSharedAsTargetArg<any, any> = {
                        currentSharedState: sharedHandler.getState(),
                        previousState: oldState,
                        currentState: newState
                    };
    
                    const diff = fun.apply(this._component, [arg]);
                    if(diff != null){
                        pushToAccDiff(targetMapper.sharedComponent, diff);
                    }                    
                }
            }
        }

        if(sharedStateChangeAcc != null) {
            for (const {sharedComponent, diff} of sharedStateChangeAcc) {
                const sharedHandler: IStateHandler<any> = sharedComponent[StateTrackerContext.contextRefPropertyId]?.getHandler();
                if (sharedHandler == null) {
                    throw new Error('Shared component should be initialized with state tracking')
                }
                sharedHandler.modifyStateDiff(diff);
            }
        }

        function pushToAcc(sharedComponent: Object, sharedProp: any, newValue: any) {
            if(sharedStateChangeAcc == null) {
                sharedStateChangeAcc = [];
            }

            let t = sharedStateChangeAcc.find(x=> x.sharedComponent === sharedComponent);
            if (t == null) {
                const diff = {};
                diff[sharedProp] = newValue;
                t = {sharedComponent, diff};
                sharedStateChangeAcc.push(t)
            } else {
                t.diff[sharedProp] = newValue;
            }
        }

        function pushToAccDiff(sharedComponent: Object, diff: any) {
            if(sharedStateChangeAcc == null) {
                sharedStateChangeAcc = [];
            }

            let t = sharedStateChangeAcc.find(x=> x.sharedComponent === sharedComponent);
            if (t == null) {
                t = {sharedComponent, diff};
                sharedStateChangeAcc.push(t)
            } else {
                Object.assign(t.diff, diff);
            }
        }

        function pushToTargetMappers(sharedComponent: Object, fs: (Modifier<any>)[]){
            if (targetMappers == null) {
                targetMappers = [];
            }

            let t = targetMappers.find(x => x.sharedComponent === sharedComponent);

            if (!t) {
                t = {sharedComponent, fun: []};
                targetMappers.push(t);
            }
            for(const fun of fs) {
                if(t.fun.indexOf(fun) < 0) {
                    t.fun.push(fun);
                }    
            }
        }
    }

    public modifyStateDiff(diff: ComponentStateDiff<TComponent>): boolean {
        if (diff == null) {
            return false;
        }
        StateTrackerContext.notifyQueue.initUpdating();
        try {
            let previousState = this.state;

            const { newState, asyncModifiers, emitterProps: alwaysEmittedProps } =
                Functions.updateCycle(this._stateMeta, previousState, diff, true);

            this.state = newState;

            const result = this.state !== previousState;

            //Add missing getters and setters if a prop returned by a modifier
            const newStateKeys: any[] = Object.keys(newState) as (keyof any)[];
            for (const p of newStateKeys) {
                if (Object.getOwnPropertyDescriptor(this._component, p)?.get == null) {
                    if (!checkIsEventEmitterLike(this._component[p]) && !checkIsObservableLike(this._component[p])) {
                        this.replaceMember(p, false);
                    }
                }
            }

            this.updateSharedComponentsAfterThisStateChange(newState, previousState, newStateKeys);

            //Emit outputs
            if (result || alwaysEmittedProps != null) {
                for (const emitterProp of Object.keys(this._emittersDict)) {
                    const se = this._emittersDict[emitterProp];
                    let checkAlwaysEmittedProps = true;
                    if (result) {
                        if (!cmpByProp(newState, previousState, emitterProp)) {
                            if(checkIsSubjectLike(se)) {
                                se.next(newState[emitterProp]);
                            } else {
                                se.emit(newState[emitterProp]);
                            }                            
                            checkAlwaysEmittedProps = false;
                        }
                    }

                    if (alwaysEmittedProps != null && checkAlwaysEmittedProps) {
                        if (alwaysEmittedProps.indexOf(emitterProp) >= 0) {
                            if(checkIsSubjectLike(se)) {
                                se.next(newState[emitterProp]);
                            } else {
                                se.emit(newState[emitterProp]);
                            }                            
                        }
                    }
                }
            }

            if (asyncModifiers && asyncModifiers.length > 0) {
                AsyncState.pushModifiers(this, asyncModifiers, previousState, diff);
            }

            if (this._subscribers.length > 0 && result) {
                for (const subscriber of this._subscribers) {
                    subscriber.onStateChange(this._component, this.state, previousState);
                }
            }

            if (result && this._options.onStateApplied != null) {
                //onStateApplied might lead to further state modification, so the call should be pushed out of the update cycle
                StateTrackerContext.notifyQueue.add(
                    this._component,
                    () => this._options.onStateApplied?.call(
                        this._component,
                        this._component,
                        this.state,
                        previousState));
            }

            return result;
        } finally {
            StateTrackerContext.notifyQueue.releaseUpdating();
        }
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
                    this.componentPropertySetter(prop, val);
                },
                enumerable: true,
                configurable: true//If property was not defined before it would not "configurable"
            });
    }

    private replaceMemberBoundToShared(prop: PropertyKey, sharedProp: PropertyKey, sharedComponent: Object) {

        if (checkIsObservableLike(this._component[prop])) {
            throw new Error(`Property '${prop?.toString()}' cannot be observable since it is bound to a shared state`);
        }

        const existingDescriptor = Object.getOwnPropertyDescriptor(this._component, prop);

        const sharedValue = sharedComponent[sharedProp]

        if (!checkIsObservableLike(sharedValue)) {
            //Copy value from shared tracker
            this.state[prop] = sharedValue;

            Object.defineProperty(this._component,
                prop,
                {
                    get: () => {
                        return sharedComponent[sharedProp];
                    },
                    set: (val) => {
                        if (existingDescriptor?.set) {
                            //It is required to sync shared and local if there is no subscription.
                            //for proper modifiers selection
                            this.syncStateWithShared(sharedProp);

                            existingDescriptor.set.call(this, val);
                        } else {//modifyStateDiff will update it
                            sharedComponent[sharedProp] = val;
                        }
                    },
                    enumerable: true
                });            
        } else {

            if(checkIsSubjectLike(sharedValue)) {
                Object.defineProperty(this._component,
                    prop,
                    {
                        get: () => {
                            return this.state[prop];
                        },
                        set: (val) => {
                            sharedValue.next(val);
                        },
                        enumerable: true
                    });    
            } else {
                Object.defineProperty(this._component,
                    prop,
                    {
                        get: () => {
                            return this.state[prop];
                        },
                        set: () => {
                            throw new Error(`Value cannot be set for shared observable property '${sharedProp.toString()}' since it is not a subject`);
                        },
                        enumerable: true
                    });    
            }
        }
    }

    private syncStateWithShared(sharedStateProp: PropertyKey) {
        if (!this._sharedComponentPropBindingMap) {
            throw new Error("Shared state prop map should be set");
        }
        const mappedComponentProps = Object.keys(this._sharedComponentPropBindingMap);

        let diff: Object | null = null;//Difference between local and shared states 

        for (const componentProp of mappedComponentProps) {
            const m = this._sharedComponentPropBindingMap[componentProp];
            if (m[0] === sharedStateProp) {
                const sharedProp = m[1];
                const sharedValue = sharedStateProp[sharedProp];
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

    private componentPropertySetter(prop: PropertyKey, value: any) {
        if (this._options.immediateEvaluation) {
            const diff = {};
            diff[prop] = value;
            this.modifyStateDiff(diff);
        } else {
            if (this._changesBuffer == null) {
                this._changesBuffer = {};
            }
            this._changesBuffer[prop] = value;
            this.scheduleNotImmediateCallback();
        }
    }

    private scheduleNotImmediateCallback() {
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

    private subscribeSharedStateChange(): ISharedStateChangeSubscription | null {
        if (this._sharedComponents == null) {
            return null;
        }

        if (this._subscription != null) {
            throw new Error("State tracker has already been subscribed to shared state changes");
        }

        const refs: IStateTrackerRef[] = this.ensureArray(this._sharedComponents).map(ss => ss[StateTrackerContext.contextRefPropertyId]) ;

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

        if(this._observableSubscriptions != null) {
            for(const s of this._observableSubscriptions){
                s.unsubscribe();
            }
            this._observableSubscriptions = null;
        }
    }

    private whenAll(): Promise<any> {
        return AsyncState.whenAll(this);
    }

    private onSharedStateChanged(sharedStateComponent: Object, newState: Object, previous: Object) {
        if (!this._sharedComponentPropBindingMap) {
            throw new Error("Shared state prop map should be set");
        }
        const mappedComponentProps = Object.keys(this._sharedComponentPropBindingMap);

        let diff: Object | null = null;//Difference between local and shared states 
        let sharedPrevDiff: Object | null = null;//Difference between old and new shared states 

        for (const componentProp of mappedComponentProps) {
            const m = this._sharedComponentPropBindingMap[componentProp];

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

        const modifierToExec: Modifier<any>[] = [];
        for(const ms of this._stateMeta.sharedSourceMappers) {
            if(sharedStateComponent instanceof ms.sharedType) {
                const sharedCurrentValue = newState[ms.prop];
                const sharedPrevValue = previous[ms.prop];
                if (!cmp(sharedCurrentValue, sharedPrevValue)) {
                    for(const f of ms.fun) {
                        if (modifierToExec.indexOf(f) < 0){
                            modifierToExec.push(f);
                        }    
                    }
                }
            }
        }

        if (sharedPrevDiff != null) {
            if(diff != null) {
                this.state = Object.assign({}, this.state, diff);
                Object.freeze(this.state);
            }

            this.modifyStateDiff(sharedPrevDiff as any);
        }
        
        for(const modifier of modifierToExec) {

            if (!isAsyncModifier(modifier)) {

                const arg: WithSharedAsSourceArg<any, any> = {
                    currentSharedState: newState,
                    previousSharedState: previous,
                    currentState: this.state,
                };

                const locDiff = modifier.apply(this._component, [arg]);
                if(locDiff != null) {
                    this.modifyStateDiff(locDiff);
                }                
            }
        }
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