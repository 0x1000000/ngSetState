export function checkPromise<TState>(data: any): data is PromiseLike<TState> {
    return data && typeof data.then === "function";
}

export function cmpByPropsAll<T>(obj1: T, obj2: T, props: (keyof T)[]): boolean {
    if (props == null || props.length < 1) {
        throw new Error("At least one property is expected");
    }
    for (const prop of props) {
        if (!cmpByProp(obj1, obj2, prop)) {
            return false;
        }
    }
    return true;
}

export function cmpByProp<T>(obj1: T, obj2: T, prop: (keyof T)): boolean {//In future there will be some options here
    if (obj1 == null || prop == null) {
        return false;
    }
    return cmp(obj1[prop],obj2[prop]);
}

export function cmp<T>(obj1: T, obj2: T): boolean { //In future there will be some options here
    return obj1 === obj2 || (Number.isNaN(obj1 as any) && Number.isNaN(obj2 as any));
}

export function delayMs(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs));
}