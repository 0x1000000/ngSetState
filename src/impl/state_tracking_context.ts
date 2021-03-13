import { EventEmitter } from '@angular/core';
import { Functions } from '../impl/functions';
import { AsyncState } from '../impl/async_state';
import { StateMeta } from './domain';
import { IStateHolder } from '../api/i_with_state';
import { EMITTER_SUFFIX } from './domain';
import { cmpByProp } from './utils';
import { StateTrackingOptions, ComponentState, IStateHandler, ComponentStateDiff } from '../api/state_tracking';

type PropertyKey = keyof any;

export class StateTrackerContext<TComponent> implements IStateHolder<ComponentState<TComponent>>, IStateHandler<TComponent> {
    public state: ComponentState<TComponent>;

    private _callbackIsScheduled: boolean = false;

    private _changesBuffer: Partial<ComponentState<TComponent>> | null;

    private readonly _emittersDict: { [k: string]: EventEmitter<any> } = {};

    private readonly _stateMeta: StateMeta<any>;

    private readonly _component: TComponent;

    private readonly _options: StateTrackingOptions<TComponent>;

    private readonly _sharedState: Object | null;

    constructor(component: TComponent, stateMeta: StateMeta<any>, options: StateTrackingOptions<TComponent> | null |undefined) {

        this._component = component;
        this._stateMeta = stateMeta;
        this._options = this.ensureDefaultOptions(options);

        const externalState: ComponentStateDiff<TComponent> | null = this._options.getInitialState?.call(component, component);

        this.state = <ComponentState<TComponent>>(externalState ?? <ComponentState<TComponent>>{});

        //adds to state all props mentioned as modifier dependencies
        const props = this._stateMeta.modifiers.map(m => m.prop);

        props.push(...this._stateMeta.explicitStateProps.filter(e => props.indexOf(e) < 0));

        //adds to state all props with some initial value
        for (const key of Object.keys(this._component)) {
            const value = component[key];
            if (value != undefined) {               
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

        for (const e of props) {
            this.replaceMember(e, externalState == null);
        }

        this._sharedState = this._options.getSharedStateTracker?.call(component, component);

        if (this._sharedState) {
            for (const sk of Object.keys(this._sharedState).filter(k => Object.getOwnPropertyDescriptor(this._sharedState, k)?.set != null)) {
                this.replaceSharedMember(sk, this._sharedState);
            }
        }

        this._options.setHandler?.call(component, component,
            {
                getState: () => this.getState(),
                modifyStateDiff: (diff) => this.modifyStateDiff(diff)
            });

        //Push async init
        if (stateMeta.asyncInit != null) {
            const init = stateMeta.asyncInit;
            setTimeout(() => AsyncState.pushModifiers(this, [init], this.state, {}));
        }
    }

    public modifyStateDiff(diff: Partial<ComponentState<TComponent>> | null): boolean {
        if (diff == null) {
            return false;
        }

        let previousState = this.state;

        if (this._sharedState != null) {
            previousState = Object.assign({}, previousState, this._sharedState);
        }


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
                const desc = Object.getOwnPropertyDescriptor(this._sharedState, p);
                if (desc != null && desc.set != null && previousState[p] !== newState[p]) {
                    desc.set.call(this._sharedState, newState[p]);
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
                enumerable: true
            });

    }

    private replaceSharedMember(prop: PropertyKey, sharedState: Object) {

        const existingDescriptor = Object.getOwnPropertyDescriptor(this._component, prop);
        Object.defineProperty(this._component,
            prop,
            {
                get: () => {
                    return sharedState[prop];
                },
                set: (val) => {
                    if (existingDescriptor?.set) {
                        existingDescriptor.set.call(this, val);
                    } else {//modifyStateDiff will update it
                        sharedState[prop] = val;
                    }
                },
                enumerable: true
            });
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

    private ensureDefaultOptions(options: StateTrackingOptions<TComponent> | null | undefined)
        : StateTrackingOptions<TComponent>
    {
        const res: Required<StateTrackingOptions<TComponent>> = {
            immediateEvaluation: false,
            onStateApplied: null,
            getInitialState: null,
            setHandler: null,
            getSharedStateTracker: null
        };

        if (options != null) {
            return Object.assign(res, options);
        }

        return res;
    }
}