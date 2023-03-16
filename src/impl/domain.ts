import { IStateHolder } from './../api/i_with_state';
import { Constructor, AsyncContext, StateActionBase } from './../api/common';
import { ComponentState, ComponentStateDiff, StateDiff } from './../api/state_tracking';

export const STATE_META = "__state_meta__";

export const EMITTER_SUFFIX = "Change";

export const ASYNC_STATE = "__async_state__";

type S<T> = ComponentState<T>;
type SD<T> = ComponentStateDiff<T>;

export interface PropMeta<TComponent> {
    readonly stateProp: keyof S<TComponent>,
    readonly componentProp: string,
}

export type SharedBindingRef = {
    sharedProp:(keyof any),
    sharedType?: Constructor<any>,
    index?: number
}

export interface StateMeta<TComponent> {
    allDecoratedProperties: PropertyDescriptor[];
    inputs: PropMeta<TComponent>[];
    outputs: PropMeta<TComponent>[];
    emitters: (keyof S<TComponent>)[];
    emitterMaps: { [key: string]: keyof S<TComponent> };
    modifiers: { prop: (keyof S<TComponent>), fun: (Modifier<TComponent> | AsyncModifier<TComponent>)[] }[];
    actionModifiers: { actionType: Constructor<StateActionBase>, fun: (ActionModifier<TComponent, StateActionBase>|AsyncActionModifier<TComponent, StateActionBase>)[] } [];
    sharedSourceMappers: { prop: (keyof any), sharedType: Constructor<any>, fun: Modifier<TComponent>[] }[];
    sharedTargetMappers: { prop: (keyof S<TComponent>), sharedType: Constructor<any>, fun: Modifier<any>[] }[];
    explicitStateProps: (keyof S<TComponent>)[];
    sharedBindings: { [key: string]: SharedBindingRef };
    asyncInit: AsyncModifier<TComponent> | null;
}

export interface Modifier<TComponent> {
    (currentSate: S<TComponent>, previousSate: S<TComponent>, diff: SD<TComponent>): StateDiff<TComponent>;
    callOnInit?: boolean;
}

export interface AsyncModifier<TComponent> {
    (currentSate: AsyncContext<TComponent>, originalState: S<TComponent>, diff: SD<TComponent>): Promise<StateDiff<TComponent>> | null;    

    asyncData: AsyncData;

    propertyKey: keyof any;
}

export interface ActionModifier<TComponent, TAction> {
    (action: TAction, currentSate: S<TComponent>): StateDiff<TComponent> | null;    
}

export interface AsyncActionModifier<TComponent, TAction> {
    (action: TAction, currentSate: AsyncContext<TComponent>): Promise<StateDiff<TComponent>> | null;    

    asyncData: AsyncData;

    propertyKey: keyof any;
}

export interface ConComponent<TComponent> {
    getComponent: () => IStateHolder<TComponent>;
}

export function isAsyncModifier<TState>(modifier: AsyncModifier<TState> | Modifier<TState>): modifier is AsyncModifier<TState> {
    return (<AsyncModifier<TState>>modifier).asyncData != null;
}

export function isAsyncActionModifier<T, TA>(modifier: AsyncActionModifier<T, TA> | ActionModifier<T, TA>): modifier is AsyncActionModifier<T, TA> {
    return (<AsyncActionModifier<T, TA>>modifier).asyncData != null;
}


export type behaviorOnConcurrentLaunch = "cancel" | "putAfter" | "replace" | "concurrent" | "throwError";
export type behaviorOnError = "throw" | "forget" | {callMethod: (currentState: any, error: any) => any};

export type AsyncData =
{
    locks: string[] | null,
    behaviorOnConcurrentLaunch: behaviorOnConcurrentLaunch;
    behaviorOnError: behaviorOnError;
    predicate: ((state: any) => boolean) | null | undefined;
    preSet: ((state: any) => any) | null;
    finalizer: ((state: any) => any) | null;
}

export type AsyncModifierWithParameters<TComponent> = {
    mod: AsyncModifier<TComponent>, previousState: ComponentState<TComponent>, diff: ComponentStateDiff<TComponent>
};

export type AsyncActionModifierWithParameters<TComponent, TAction> = {
    mod: AsyncActionModifier<TComponent, TAction>, action: TAction
};

export type ModifierWithParameters<TComponent, TAction> = AsyncActionModifierWithParameters<TComponent, TAction> | AsyncModifierWithParameters<TComponent>;

export function isAsyncActionModifierWithParameters<TComponent, TAction>(p: ModifierWithParameters<TComponent, TAction>): p is AsyncActionModifierWithParameters<TComponent, TAction> {
    return (p as AsyncActionModifierWithParameters<TComponent, TAction>).action != null;
}

export type RunningModifier<TComponent> = {
    readonly id: number,
    readonly modifier: ModifierWithParameters<TComponent, any>,
    readonly promise: Promise<void>;
    readonly originalParameters: ModifierWithParameters<TComponent, any>;
    next: ModifierWithParameters<TComponent, any> | null;
    finalization?: boolean;//Async promise is completed and it is about to apply a new state
}