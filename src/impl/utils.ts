export function checkPromise<TState>(data: any): data is PromiseLike<TState> {
    return data && typeof data.then === "function";
}