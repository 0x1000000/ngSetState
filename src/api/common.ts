import { ComponentState } from "./state_tracking";

export interface Constructor<T> { new(...args: any[]): T; }

export interface AsyncContext<TState> {
    (): ComponentState<TState>;

    isCancelled: () => boolean;
}

export interface ObservableLike<T> {
    subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): SubscriptionLike;
    subscribe(observerOrNext?: any, error?: any, complete?: any): SubscriptionLike;
}

export interface EventEmitterLike<T> {
    emit(value?: T): void;
    subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): SubscriptionLike;
    subscribe(observerOrNext?: any, error?: any, complete?: any): SubscriptionLike;
}

export interface SubjectLike<T> extends ObservableLike<T> {
    next(value?: T): any;
}

export interface SubscriptionLike {
    unsubscribe(): void;
    readonly closed: boolean;
}