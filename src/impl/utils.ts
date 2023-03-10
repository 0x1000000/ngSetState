import { EventEmitterLike, ObservableLike, SubjectLike } from "./../api/common";

export function checkPromise<TState>(data: any): data is PromiseLike<TState> {
    return data && typeof data.then === "function";
}

export function checkIsEventEmitterLike<T>(o: any): o is EventEmitterLike<T> {
    return o != null 
        && (o as EventEmitterLike<T>).emit != null
        && (o as EventEmitterLike<T>).subscribe != null
}

export function checkIsObservableLike<T>(o: any): o is ObservableLike<T> {
    return o != null && (o as ObservableLike<T>).subscribe != null;        
}

export function checkIsSubjectLike<T>(o: any): o is SubjectLike<T> {
    return checkIsObservableLike<T>(o) && (o as SubjectLike<T>).next != null
        && o['ngOnDestroy'] == null && o['addReducer'] == null;//ngRx
}

export function checkIsOnlyObservableLike<T>(o: any): o is ObservableLike<T> {
    return checkIsObservableLike(o) && !checkIsSubjectLike(o);
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

export function cmpByProp<T>(obj1: T, obj2: any, prop: (keyof T)): boolean {//In future there will be some options here
    if (obj1 == null || prop == null) {
        return false;
    }
    return cmp(obj1[prop], (obj2 as T)[prop]);
}

export function cmp<T>(obj1: T, obj2: T): boolean { //In future there will be some options here
    return obj1 === obj2 || (Number.isNaN(obj1 as any) && Number.isNaN(obj2 as any));
}

export function delayMs(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs));
}