import { Constructor, AsyncContext } from './../api/common';

export const STATE_META = "__state_meta__";

export const EMITTER_SUFFIX = "Change";

export const ASYNC_STATE = "__async_state__";

export interface PropMeta<TState> {
    readonly stateProp: keyof TState,
    readonly componentProp: string,
}

export interface StateMeta<TState> {
    stateConstructor: Constructor<TState> | null;
    inputs: PropMeta<TState>[];
    outputs: PropMeta<TState>[];
    modifiers: { prop: (keyof TState), fun: (Modifier<TState> | AsyncModifier<TState>)[] }[];
    asyncInit: AsyncModifier<TState> | null;
}

export interface Modifier<TState> {
    (currentSate: TState, previousSate: TState, diff: Partial<TState>): Partial<TState> | null;    
}

export interface AsyncModifier<TState> {
    (currentSate: AsyncContext<TState>, originalState: TState, diff: Partial<TState>): Partial<TState> | null;    

    asyncData: AsyncData;
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
}

export type RunningModifier<TState> = {
    readonly id: number,
    readonly modifier: AsyncModifier<TState>,
    readonly promise: Promise<void>;
    readonly originalState: TState;
    readonly originalDiff: Partial<TState>;
    next: AsyncModifier<TState> | null;
}