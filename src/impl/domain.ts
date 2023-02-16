import { IStateHolder } from './../api/i_with_state';
import { Constructor, AsyncContext } from './../api/common';
import { ComponentState, ComponentStateDiff } from './../api/state_tracking';

export const STATE_META = "__state_meta__";

export const EMITTER_SUFFIX = "Change";

export const ASYNC_STATE = "__async_state__";

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

export interface PropMeta<TComponent> {
    readonly stateProp: keyof S<TComponent>,
    readonly componentProp: string,
}

export type SharedBindingRef = ((keyof any) | [(keyof any), number]);

export interface StateMeta<TComponent> {
    inputs: PropMeta<TComponent>[];
    outputs: PropMeta<TComponent>[];
    emitters: (keyof S<TComponent>)[];
    emitterMaps: { [key: string]: keyof S<TComponent> };
    modifiers: { prop: (keyof S<TComponent>), fun: (Modifier<TComponent> | AsyncModifier<TComponent>)[] }[];
    explicitStateProps: (keyof S<TComponent>)[];
    sharedBindings: { [key: string]: SharedBindingRef };
    asyncInit: AsyncModifier<TComponent> | null;
}

export interface Modifier<TComponent> {
    (currentSate: S<TComponent>, previousSate: S<TComponent>, diff: SD<TComponent>): SD<TComponent>;
}

export interface AsyncModifier<TComponent> {
    (currentSate: AsyncContext<TComponent>, originalState: S<TComponent>, diff: SD<TComponent>): Promise<SD<TComponent>> | null;    

    asyncData: AsyncData;
}

export interface ConComponent<TComponent> {
    getComponent: () => IStateHolder<TComponent>;
}

export function isAsyncModifier<TState>(modifier: AsyncModifier<TState> | Modifier<TState>): modifier is AsyncModifier<TState> {
    return (<AsyncModifier<TState>>modifier).asyncData != null;
}

export type BehaviourOnConcurrentLaunch = "cancel" | "putAfter" | "replace" | "concurrent";
export type BehaviourOnError = "throw" | "forget" | {callMethod: (currentState: any, error: any) => any};

export type AsyncData =
{
    locks: string[] | null,
    behaviourOnConcurrentLaunch: BehaviourOnConcurrentLaunch;
    behaviourOnError: BehaviourOnError;
    predicate: ((state: any) => boolean) | null;
    finalizer: (() => any) | null;
}

export type RunningModifier<TComponent> = {
    readonly id: number,
    readonly modifier: AsyncModifier<TComponent>,
    readonly promise: Promise<void>;
    readonly originalState: S<TComponent>;
    readonly originalDiff: SD<TComponent>;
    next: AsyncModifier<TComponent> | null;
}