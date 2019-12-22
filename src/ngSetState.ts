import { OnChanges, SimpleChanges, EventEmitter } from "@angular/core";

export interface IWithState<TState> extends OnChanges {
    state: TState;

    modifyState(propName: keyof TState, value: any): boolean;

    modifyStateDiff(diff: Partial<TState>|null): boolean;

    onAfterStateApplied?(previousState?: TState): void;
}

export abstract class WithStateBase<TState> implements IWithState<TState> {

    constructor(initialState: TState, ngInputs: string[] | null, ngOutputs: string[] | null) {
        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(initialState);
        stateMeta.stateConstructor = <Constructor<TState>>initialState.constructor;
        Functions.initialize(this, initialState, ngInputs, ngOutputs);

        this.state = initialState;
    }

    public state: TState;

    public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): boolean {
        return Functions.modifyState(this, propName, value);
    }

    public modifyStateDiff(diff: Partial<TState> | null): boolean {
        return Functions.nextState(this, diff);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        Functions.ngOnChanges(this, changes);
    }    

    public whenAll(): Promise<any> {
        return AsyncState.whenAll(this);
    }
}

export function WithState<TState>(stateType: Constructor<TState>, ngInputs: string[], ngOutputs: string[], factory?: () => TState): (t: Constructor<any>) => any {

    if (stateType == null) {
        throw new Error("Initial state type should be defined or a factory provided");
    }

    const stateMeta: StateMeta<TState> = Functions.ensureStateMeta<TState>(stateType);
    stateMeta.stateConstructor = stateType;

    return (target: NgComponentType) => {
        return class extends target implements IWithState<TState> {

            public state: TState = (() => {

                const initialState = factory != null ? factory() : new stateType();

                Functions.initialize(this, initialState, ngInputs, ngOutputs);

                return initialState;
            })();

            public modifyState<TK extends keyof TState>(propName: TK, value: TState[TK]): boolean {
                return Functions.modifyState(this, propName, value);
            }

            public modifyStateDiff(diff: Partial<TState> | null): boolean {
                return Functions.nextState(this, diff);
            }

            public ngOnChanges(changes: SimpleChanges): void {

                Functions.ngOnChanges(this, changes);

                if (super.ngOnChanges) {
                    super.ngOnChanges(changes);
                }
            }
        };
    };
}

export function In<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.inputs.findIndex(i=>i.stateProp === propertyKey) >= 0) {
            throw new Error(`Input with name '${propertyKey}' has been alredy declared`);
        }

        stateMeta.inputs.push({ stateProp: propertyKey, componentProp: componentProp ? componentProp  : (propertyKey as string) });
    };
}

export function Out<TState>(componentProp?: string): any {
    return (target: TState, propertyKey: keyof TState) => {
        const stateMeta = Functions.ensureStateMeta(target);

        if (stateMeta.outputs.findIndex(i => i.stateProp === propertyKey) >= 0) {
            throw new Error(`Output with name '${propertyKey}' has been alredy declared`);
        }

        if (!componentProp) {
            if (typeof propertyKey === "string" &&
            (propertyKey.length < EMITTER_SUFFIX.length || !(propertyKey.indexOf(EMITTER_SUFFIX, propertyKey.length - EMITTER_SUFFIX.length) !== -1))) {
                componentProp = propertyKey + EMITTER_SUFFIX;
            } else {
                componentProp = propertyKey as string;
            }
        }       
        stateMeta.outputs.push({ stateProp: propertyKey, componentProp: componentProp });
    };
}

export function Calc<TState, Prop extends keyof TState>(propNames: (keyof TState)[], func: (currentSate: TState, previousSate: TState, diff: Partial<TState>) => TState[Prop]): any {
    return (target: TState, propertyKey: Prop) => {
        const stateMeta = Functions.ensureStateMeta(target);

        const modifier: Modifier<TState> = (currentSate: TState, previousSate: TState, diff: Partial<TState>) => {
            const res: Partial<TState> = {};
            res[propertyKey] = func(currentSate, previousSate, diff);
            return res;
        };
        for (const propName of propNames) {

            let detect = false;
            for (const m of stateMeta.modifiers) {

                if (m.prop === propName) {
                    m.fun.push(modifier);
                    detect = true;
                }
            }

            if (!detect) {
                stateMeta.modifiers.push({ prop: propName, fun: [modifier] });
            }
        }
    };
}

function addModifier<TState>(target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor, propNames: (keyof TState)[], asyncData: AsyncData | null) {
    const stateMeta = Functions.ensureStateMeta(target);
    let modifier: Modifier<TState> | AsyncModifier<TState> = descriptor.value;

    if (asyncData) {
        const original = modifier;
        modifier = function (...args: any[]) {
            return original.apply(this, args);
        };
        (<AsyncModifier<TState>><any>modifier).asyncData = asyncData;
    }

    for (const propName of propNames) {
        let detect = false;
        for (const m of stateMeta.modifiers) {

            if (m.prop === propName) {
                if (m.fun.includes(modifier)) {
                    throw new Error(`Modifier with name '${propertyKey}' has been alredy declared`);
                }
                m.fun.push(modifier);
                detect = true;
            }
        }

        if (!detect) {
            stateMeta.modifiers.push({ prop: propName, fun: [modifier] });
        }
    }

}

export function With<TState>(...propNames: (keyof TState)[]) {
    return (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
        return addModifier(target, propertyKey, descriptor, propNames, null);
    };
}

export function WithAsync<TState>(...propNames: (keyof TState)[]): IWithAsyncAndAllOptions<TState>{

    const asyncData: AsyncData = {
        locks: [],
        behaviourOnConcurrentLaunch: "putAfter",
        behaviourOnError: "throw",
    };

    const result: IWithAsyncAndAllOptions<TState> = <any>
        ((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {
            return addModifier(target, propertyKey, descriptor, propNames, asyncData);
        });

    const checks: { onConcurrent: boolean, locks: boolean, onError: boolean } = {onConcurrent: false, locks: false, onError: false};

    const checkOnConcurrent = () => {
        if (checks.onConcurrent) {
            throw new Error("function OnConcurrent...() has been called several times");
        } else {
            checks.onConcurrent = true;
        }
    };
    const checkLocks = () => {
        if (checks.locks) {
            throw new Error("function Locks() has been called several times");
        } else {
            checks.locks = true;
        }
    };
    const checkOnError = () => {
        if (checks.onError) {
            throw new Error("function OnError...() has been called several times");
        } else {
            checks.locks = true;
        }
    };

    const optional: IWithAsyncAllOptions<TState> = {
        OnConcurrentLaunchCancel: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "cancel";
            return result;
        },
        OnConcurrentLaunchPutAfter: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "putAfter";
            return result;
        },
        OnConcurrentLaunchReplace: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "replace";
            return result;
        },
        OnConcurrentLaunchConcurrent: () => {
            checkOnConcurrent();
            asyncData.behaviourOnConcurrentLaunch = "concurrent";
            return result;
        },
        Locks: (...lockIds: string[]) => {
            checkLocks();
            asyncData.locks = lockIds;
            return result;
        },
        OnErrorThrow: () => {
            checkOnError();
            asyncData.behaviourOnError = "throw";
            return result;
        },
        OnErrorForget: () => {
            checkOnError();
            asyncData.behaviourOnError = "forget";
            return result;
        },
        OnErrorCall: (method: (currentState: TState, error: any) => Partial<TState> | null) => {
            checkOnError();
            asyncData.behaviourOnError = { callMethod: method };
            return result;
        }
    }

    Object.assign(result, optional);

    return result;
}

export type IWithAsyncAllOptions<TState> = IWithAsyncOnConcurrentLaunch<TState> & IWithAsyncLocks<TState> & IWithAsyncOnError<TState>;
export type IWithAsyncAndAllOptions<TState> = IWithAsync<TState> & IWithAsyncAllOptions<TState>;

export interface IWithAsyncOnConcurrentLaunch<TState> {
    OnConcurrentLaunchCancel(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchPutAfter(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchReplace(): IWithAsyncAndAllOptions<TState>;
    OnConcurrentLaunchConcurrent(): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncLocks<TState> {
    Locks(...lockIds: string[]): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsyncOnError<TState> {
    OnErrorThrow(): IWithAsyncAndAllOptions<TState>;
    OnErrorForget(): IWithAsyncAndAllOptions<TState>;
    OnErrorCall(method: (currentState: TState, error: any)=> Partial<TState>|null): IWithAsyncAndAllOptions<TState>;
}

export interface IWithAsync<TState> {
    (target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor);
}

export function AsyncInit<TState>(): IWithAsync<TState> & IAsyncInitLocks<TState> {

    const asyncData: AsyncData = {
        locks: [],
        behaviourOnConcurrentLaunch: "concurrent",
        behaviourOnError: "throw",
    };

    const result: IWithAsync<TState> =
        ((target: Constructor<TState>, propertyKey: string, descriptor: PropertyDescriptor) => {

            const stateMeta = Functions.ensureStateMeta(target);

            let asyncInit: AsyncModifier<TState> = descriptor.value;

            const original = asyncInit;
            asyncInit = function(...args: any[]) {
                return original.apply(this, args);
            } as any;

            (<AsyncModifier<TState>><any>asyncInit).asyncData = asyncData;

            stateMeta.asyncInit = asyncInit;
        }) as any;

    const optional: IAsyncInitLocks<TState> = {
        Locks: (...lockIds: string[]) => {
            asyncData.locks = lockIds;
            return result;
        }
    };
    return Object.assign(result, optional);
}

export interface IAsyncInitLocks<TState> {
    Locks(...lockIds: string[]): IWithAsync<TState>;
}

class Functions {

    public static initialize<TState>(component: IWithState<TState>, state: TState, ngInputs: string[] | null, ngOutputs: string[] | null) {

        if (component.state != null) {
            throw new Error("component should not have any initial state at this point");
        }
        if (state == null) {
            throw new Error("initial state should be defined");
        }

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(state);

        //CheckInputs

        if (ngInputs != null) {
            const inputCmp = Functions.compareArrays(stateMeta.inputs.map(i => i.componentProp), ngInputs);

            if (inputCmp.missedInArr1.length > 0) {
                throw new Error("Could not find the following inputs in the state class: " + inputCmp.missedInArr1.join(","));
            }
            if (inputCmp.missedInArr2.length > 0) {
                throw new Error("Could not find the following inputs in the component annotation: " + inputCmp.missedInArr2.join(","));
            }
        }

        if (ngOutputs != null) {
            const outCmp = Functions.compareArrays(stateMeta.outputs.map(i => i.componentProp), ngOutputs);

            if (outCmp.missedInArr1.length > 0) {
                throw new Error("Could not find the following outputs in the state class: " + outCmp.missedInArr1.join(","));
            }
            if (outCmp.missedInArr2.length > 0) {
                throw new Error("Could not find the following outputs in the component annotation: " + outCmp.missedInArr2.join(","));
            }
        }

        //Create component emitters
        for (const outputProp of stateMeta.outputs) {
            const emitterProp = outputProp.componentProp;

            if (component[emitterProp] == null) {
                component[emitterProp] = new EventEmitter<any>();
            }
        }

        //Set initial values for input component properties
        for (const inputProp of stateMeta.inputs) {
            component[inputProp.componentProp] = state[inputProp.stateProp];
        }


        //Push async init
        if (stateMeta.asyncInit != null) {
            const init = stateMeta.asyncInit
            setTimeout(() => AsyncState.pushModifiers(component, [init]));
        }        
    }

    public static ngOnChanges<TState>(component: IWithState<TState>, changes: SimpleChanges): void {

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        let diff: Partial<TState> | null = null;
        for (const prop of stateMeta.inputs) {

            const change = changes[prop.componentProp];

            if (change && change.currentValue !== component.state[prop.stateProp]) {
                if (!diff) {
                    diff = {};
                }
                diff[prop.stateProp] = change.currentValue;
            }
        }

        if (diff) {
            Functions.nextState(component, diff);
        }
    }

    public static modifyState<TState, TK extends keyof TState>(component: IWithState<TState>, propName: TK, value: TState[TK]): boolean {
        if (component.state[propName] !== value) {
            const diff: Partial<TState> = {};
            diff[propName] = value;
            return Functions.nextState(component, diff);
        }
        return false;
    }

    public static nextState<TState>(component: IWithState<TState>, diff: Partial<TState> | null): boolean {
        if (diff == null) {
            return false;
        }

        const stateMeta: StateMeta<TState> = Functions.ensureStateMeta(component.state);

        const previousState = component.state;

        const { newState, asyncModifiers} = Functions.updateCycle(stateMeta, previousState, diff);

        component.state = newState;

        let result = false;
        if (component.state !== previousState) {
            for (const output of stateMeta.outputs) {
                if (previousState[output.stateProp] !== component.state[output.stateProp]) {
                    Functions.emit(component, output, component.state[output.stateProp]);
                }
            }

            if (component.onAfterStateApplied) {
                component.onAfterStateApplied(previousState);
            }
            result = true;
        }

        if (asyncModifiers && asyncModifiers.length > 0) {
            AsyncState.pushModifiers(component, asyncModifiers);
        }

        return result;
    }

    public static checkPromise<TState>(data: any): data is PromiseLike<TState> {
        return data && typeof data.then === "function";
    }

    private static updateCycle<TState>(stateMeta: StateMeta<TState>, previousState: TState, diff: Partial<TState>): { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null } {
        if (diff == null) {
            return {newState: previousState, asyncModifiers: null }
        }
        const currentState = Functions.cloneStateObject(previousState, diff, stateMeta);

        return Functions.applyModifiersCycle(stateMeta, currentState, previousState, diff);
    }

    private static applyModifiersCycle<TState>(stateMeta: StateMeta<TState>, currentState: TState, previousState: TState, diff: Partial<TState>): { newState: TState, asyncModifiers: AsyncModifier<TState>[] | null} {
        let watchDog = 1000;
        let diffKeys = Object.keys(diff);
        let modifiers: (Modifier<TState> | AsyncModifier<TState>)[] = Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, null);

        let asyncModifiers: AsyncModifier<TState>[]|null = null;

        while (watchDog > 0) {

            if (modifiers.length < 1) {
                return { newState: currentState, asyncModifiers: asyncModifiers };
            }
            const modifiersAcc: Modifier<TState>[] = [];
            for (const modifier of modifiers) {
                if (isAsyncModifier(modifier)) {
                    if (!asyncModifiers) {
                        asyncModifiers = [];
                    }
                    asyncModifiers.push(modifier);
                    continue;
                }

                diff = modifier.apply(currentState, [currentState, previousState, diff]);
                if (Functions.checkPromise(diff)) {
                    throw new Error(`All functions which return promises and are marked with "@With" should be also marked with "@Async"`);
                }
                if (diff != null) {

                    diffKeys = Object.keys(diff);

                    if (diffKeys.some(diffKey => previousState[diffKey] !== diff[diffKey])) {
                        previousState = currentState;
                        currentState = Functions.cloneStateObject(previousState, diff, stateMeta);
                        Functions.findModifiers(stateMeta, currentState, previousState, diffKeys, modifiersAcc);
                    }
                }
            }
            modifiers = modifiersAcc;
            watchDog--;
        }
        throw new Error("Recursion overflow");
    }

    private static findModifiers<TState>(stateMeta: StateMeta<TState>, newState: TState, previousState: TState, diffKeys: string[], modifiersAcc: Modifier<TState>[] | null): (Modifier<TState> | AsyncModifier<TState>)[] {
        const acc: (Modifier<TState>|AsyncModifier<TState>)[] = modifiersAcc == null ? [] : modifiersAcc;

        for (const modifier of stateMeta.modifiers) {
            if (diffKeys.some(dk => modifier.prop === dk && previousState[dk] !== newState[dk] /*Even if the key is in diff it does not mean that the property is actually changed*/)) {
                for (const modifierFun of modifier.fun) {
                    if (acc.indexOf(modifierFun) < 0) {
                        acc.push(modifierFun);
                    }
                }
            }
        }

        return acc;
    }

    private static emit<TState>(component: IWithState<TState>, prop: PropMeta<TState>, value: any): void {
        const emitter = Functions.checkEmitter(component, prop.componentProp);

        if (!emitter) {
            throw new Error(`Could not find any emitter for "${prop}"`);
        }

        emitter.emit(value);
    }

    private static checkEmitter<TState>(component: IWithState<TState>, name: string): EventEmitter<any> | null {
        const emitter = component[name];
        if (emitter && typeof emitter.emit === "function") {
            return emitter;
        }
        return null;
    }

    public static ensureStateMeta<TState>(obj: TState | Constructor<TState>): StateMeta<TState> {
        if (obj == null) {
            throw new Error("State should be initialized");
        }

        const cons = typeof obj === "function" ? obj : obj.constructor;

        if (cons[STATE_META]) {
            return cons[STATE_META];
        }

        const stateMeta: StateMeta<TState> = { stateConstructor: null, inputs: [], outputs: [], modifiers: [], asyncInit: null };

        cons[STATE_META] = stateMeta;

        return stateMeta;
    }

    private static cloneStateObject<TState>(previousState: TState, diff: Partial<TState>, stateMeta: StateMeta<TState>): TState {

        //Check changes
        if (diff == null) {
            return previousState;
        }
        const diffProperties = Object.getOwnPropertyNames(diff);
        if (diffProperties == null || diffProperties.length < 0) {
            return previousState;
        }
        if (diffProperties.every(dp => previousState[dp] === diff[dp])) {
            return previousState;
        }

        if (stateMeta.stateConstructor) {
            const newInstance = Object.create(stateMeta.stateConstructor.prototype);
            Object.assign(newInstance, previousState, diff);
            return newInstance;
        }
        return Object.assign({}, previousState, diff);
    }

    private static compareArrays<T>(arr1: T[], arr2: T[]): { missedInArr1: T[], missedInArr2: T[] } {
        const result = { missedInArr1: [] as T[], missedInArr2: [] as T[] };

        if (arr1 != null || arr2 != null) {
            if (arr1 == null) {
                result.missedInArr1 = arr2;
            }
            else if (arr2 == null) {
                result.missedInArr2 = arr1;
            } else {
                result.missedInArr1 = arr2.filter(i => arr1.indexOf(i) < 0);
                result.missedInArr2 = arr1.filter(i => arr2.indexOf(i) < 0);
            }
        }
        return result;
    }
}

const STATE_META = "__state_meta__";

const EMITTER_SUFFIX = "Change";

const ASYNC_STATE = "__async_state__";

export interface Constructor<T> { new(...args: any[]): T; }

interface NgComponentType extends Constructor<OnChanges> {}

interface PropMeta<TState> {
    readonly stateProp: keyof TState,
    readonly componentProp: string,
}

interface StateMeta<TState> {
    stateConstructor: Constructor<TState> | null;
    inputs: PropMeta<TState>[];
    outputs: PropMeta<TState>[];
    modifiers: { prop: (keyof TState), fun: (Modifier<TState> | AsyncModifier<TState>)[] }[];
    asyncInit: AsyncModifier<TState> | null;
}

interface Modifier<TState> {
    (currentSate: TState, previousSate: TState, diff: Partial<TState>): Partial<TState> | null;    
}

interface AsyncModifier<TState> {
    (currentSate: ()=>TState): Partial<TState> | null;    

    asyncData: AsyncData;
}

function isAsyncModifier<TState>(modifier: AsyncModifier<TState> | Modifier<TState>): modifier is AsyncModifier<TState> {
    return (<AsyncModifier<TState>>modifier).asyncData != null;
}

type BehaviourOnConcurrentLaunch = "cancel" | "putAfter" | "replace" | "concurrent";
type BehaviourOnError = "throw" | "forget" | {callMethod: (currentState: any, error: any) => any};

type AsyncData =
{
    locks: string[] | null,
    behaviourOnConcurrentLaunch: BehaviourOnConcurrentLaunch;
    behaviourOnError: BehaviourOnError;
}

type RunningModifier<TState> = {
    readonly id: number,
    readonly modifier: AsyncModifier<TState>,
    readonly promise: Promise<void>;
    next: AsyncModifier<TState> | null;
}

class RunningPool<TState> {

    private readonly _storage: RunningModifier<TState>[] = [];

    private readonly _lockQueue: AsyncModifier<TState>[] = [];

    private _counter: number = 0;

    public nextOrCurrentId(modifier: AsyncModifier<TState>): [number, number|null] | null {

        const running = this.getByModifierId(modifier);

        const behaviour = modifier.asyncData.behaviourOnConcurrentLaunch;

        let oldId: number|null = null;

        if (running) {
            if (behaviour === "replace") {
                oldId = running.id;
            }
            else if (behaviour === "cancel") {
                return null;
            }

            else if (behaviour === "putAfter") {
                running.next = modifier;
                return null;
            }
            else if (behaviour !== "concurrent") {
                throw new Error("Unknown behaviour: " + behaviour);
            }
        }

        if (this.putIntoLockQueue(modifier)) {
            return null;
        }

        const id = this._counter++;
        if (this._counter === Number.MAX_SAFE_INTEGER) {
            this._counter = 0;
        }

        return [id, oldId];
    }

    public addNewAndDeleteOld(id: number, promise: Promise<void>, modifier: AsyncModifier<TState>, oldId: number | null) {

        const newItem: RunningModifier<TState> = {
            id: id,
            modifier: modifier,
            promise: promise,
            next: null
        };

        this._storage.push(newItem);
        if (oldId != null) {
            const pending = this.deleteByIdAndGetPendingModifier(oldId);
            if (pending != null) {
                throw new Error("Replaced modifier cannot have a pending one");
            }
        }
    }

    public exists(id: number) {
        return this._storage.findIndex(i => i.id === id) >= 0;
    }

    public deleteByIdAndGetPendingModifier(id: number): AsyncModifier<TState> | null {

        let result: AsyncModifier<TState> | null = null;

        const index = this._storage.findIndex(i => i.id === id);
        if (index >= 0) {
            result = this._storage[index].next;
            this._storage.splice(index, 1);
        }

        if (result == null) {
            result = this.extractFromLockQueue();
        }

        return result;
    }

    public getAllPromises(): Promise<any>[] {
        return this._storage.map(i => i.promise);
    }

    private getByModifierId(modifier: AsyncModifier<TState>): RunningModifier<TState> | null {
        const index = this._storage.findIndex(i => i.modifier === modifier);
        return index < 0 ? null : this._storage[index];
    }

    private putIntoLockQueue(modifier: AsyncModifier<TState>): boolean {
        const targetLocks = modifier.asyncData.locks;
        if (targetLocks == null || targetLocks.length < 1) {
            return false;
        }

        for (const ri of this._storage) {
            if (ri.modifier.asyncData.locks != null && ri.modifier.asyncData.locks.length > 0) {
                if (RunningPool.locksIntersect(ri.modifier, modifier)) {
                    this._lockQueue.push(modifier);
                    return true;
                }
            }
        }
        return false;
    }

    private extractFromLockQueue(): AsyncModifier<TState> | null {
        if (this._lockQueue.length < 1) {
            return null;
        }
        let index = 0;
        if (this._storage.length > 0) {
            index = this._lockQueue.findIndex(lq => !this._storage.some(s => RunningPool.locksIntersect(s.modifier, lq)));
        }
        let res: AsyncModifier<TState> | null = null;
        if (index >= 0) {
            res = this._lockQueue[index];
            this._lockQueue.splice(index, 1);
        }
        return res;
    }

    private static locksIntersect<TState>(x: AsyncModifier<TState>, y: AsyncModifier<TState>): boolean {
        const xL = x.asyncData.locks;
        const yL = y.asyncData.locks;

        if (xL == null || xL.length < 1 || yL == null || yL.length < 1) {
            return false;
        }
        return xL.some(xLi => yL.some(yLi => yLi === xLi));
    }
}

class AsyncState<TState> {

    constructor(private readonly _component: IWithState<TState>) { }

    private readonly _pool = new RunningPool<TState>();

    private pushModifiers(modifiers: AsyncModifier<TState>[]) {
        if (modifiers && modifiers.length > 0) {
            for (const mod of modifiers) {
                this.registerAndLaunchModifier(mod);
            }
        }
    }

    private registerAndLaunchModifier(mod: AsyncModifier<TState>): void {
        const ids = this._pool.nextOrCurrentId(mod);

        if (ids == null) {
            return;
        }
        const [id, oldId] = ids;

        const promise = (async () => {
            try {
                const res = mod(() => this._component.state);
                if (!Functions.checkPromise(res)) {
                    throw new Error("Async modifier should return a promise");
                }
                let diff: Partial<TState> | null = null;

                try {
                    //Running async modifier
                    diff = await res;
                } catch (error) {
                    diff = null;
                    if (mod.asyncData.behaviourOnError === "forget") {
                    }
                    else if (mod.asyncData.behaviourOnError === "throw") {
                        throw error;
                    }
                    else if (mod.asyncData.behaviourOnError.callMethod != null) {
                        const errorDiff = mod.asyncData.behaviourOnError.callMethod(this._component.state, error);
                        if (errorDiff != null) {
                            this._component.modifyStateDiff(errorDiff);
                        }
                    }
                    else {
                        throw new Error("Unknown error behaviour: " + mod.asyncData.behaviourOnError);
                    }
                }

                if (this._pool.exists(id) && diff != null) {//if was not replaced
                    this._component.modifyStateDiff(diff);
                }

            } finally {
                const pending = this._pool.deleteByIdAndGetPendingModifier(id);
                if (pending != null) {
                    this.registerAndLaunchModifier(pending);
                }
            }
        })();

        this._pool.addNewAndDeleteOld(id, promise, mod, oldId);
    }

    public static async whenAll<TState>(component: IWithState<TState>): Promise<any> {
        if (!component[ASYNC_STATE]) {
            return;
        }
        const asyncState = AsyncState.ensureComponentAsyncState(component);

        while (true) {
            var arr = asyncState._pool.getAllPromises();

            if (arr.length === 0) {
                return;
            }
            await Promise.all(arr);
        }
    }

    public static pushModifiers<TState>(component: IWithState<TState>, modifiers: AsyncModifier<TState>[]) {
        const instance = AsyncState.ensureComponentAsyncState<TState>(component);
        instance.pushModifiers(modifiers);
    }

    private static ensureComponentAsyncState<TState>(component: IWithState<TState>): AsyncState<TState> {
        if (component == null) {
            throw new Error("Component should be initialized");
        }

        if (component[ASYNC_STATE]) {
            return component[ASYNC_STATE];
        }

        const asyncState: AsyncState<TState> = new AsyncState<TState>(component);

        component[ASYNC_STATE] = asyncState;

        return asyncState;
    }
}

