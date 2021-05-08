import { Emitter, With,Calc, StateTracking, ComponentState, ComponentStateDiff, OutputFor, IncludeInState, IStateHandler, initializeStateTracking, ISharedStateChangeSubscription, BindToShared } from "../src/index";
import { } from "jasmine";
import { delayMs } from './helpers';
import { EventEmitter } from '@angular/core';
import { WithAsync } from "../src/api/state_decorators/with_async";
import { releaseStateTracking } from "../src/api/state_tracking";

describe('State Tracking...', () => {
    it('Basic Immediate', async () => {

        type State = ComponentState<TestComponent>;
        type NewState = ComponentStateDiff<TestComponent>;

        @StateTracking<TestComponent>({
            immediateEvaluation: true,
            onStateApplied: (c, s) => c.onStateApplied(s),
            getInitialState: (c) => c.getState(),
            setHandler: (c, h) => c.setHandler(h)
        })
        class TestComponent {

            constructor(initial: State | null) {
                if (initial != null) {
                    this._state = initial;
                }
            }

            public handler: IStateHandler<any>;

            @Emitter()
            public arg1: number = -1;

            public readonly arg1Change = new EventEmitter<number>();

            public arg2: number = 0;

            public result: number = 0;

            public readonly resultChange = new EventEmitter<number>();

            public result2: number = 5;

            public result3: number = 0;

            public resultAsync: number = 0;

            @IncludeInState()
            public somePropWithValue: number = 17;

            public somePropWithoutValue: number;

            private _state: State;

            public getState(): State {
                return this._state;
            }
            public onStateApplied(s: State) {
                this._state = s;
            }

            public setHandler(h: IStateHandler<State>) {
                this.handler = h;
                h.modifyStateDiff({ arg1: 0 });
            }

            @OutputFor<TestComponent>("resultAsync")
            public readonly resultAsyncSomeName = new EventEmitter<number>();

            @With("arg1", "arg2")
            public static calcResult(state: State): NewState {
                return { result: state.arg1 + state.arg2 };
            }

            @With("result")
            public static calcResult2(state: State): NewState {
                if (state.somePropWithValue !== 17) {
                    throw new Error("somePropWithValue should be initialized.");
                }
                if (state.somePropWithoutValue !== undefined) {
                    throw new Error("somePropWithoutValue should not be initialized.");
                }
                return { result2: state.result + 2 };
            }

            @With("result")
            public static calcResult3(state: State): NewState {
                return { result3: state.result + 3 };
            }

            @With("result").Debounce(10)
            public static calcResultAsync(state: State): NewState {
                return { resultAsync: state.result + 7 };
            }
        }

        //Test

        var component = new TestComponent(null);

        component.somePropWithoutValue = 18;//It should not be included into the state

        expect(component.result2).toBe(5);

        let result: number = 0;
        let resultCounter: number = 0;

        let resultAsync: number = 0;
        let resultAsyncCounter: number = 0;

        let arg1: number = 0;
        let arg1Counter: number = 0;

        sub();

        component.arg1 = 1;
        component.arg1 = 1;//arg1 is @Emitter()
        expect(arg1).toBe(1);
        expect(arg1Counter).toBe(2);
        expect(result).toBe(1);
        expect(component.result2).toBe(3);
        expect(component.result3).toBe(4);

        component.arg2 = 2;
        expect(component.getState().result).toBe(3);
        expect(component.result).toBe(3);
        expect(result).toBe(3);
        expect(component.result).toBe(3);
        expect(component.getState().result).toBe(3);
        expect(component.result2).toBe(5);
        expect(component.result3).toBe(6);

        //Restate
        component = new TestComponent(component.getState());
        sub();

        component.result = 8;
        expect(result).toBe(8);
        expect(component.result2).toBe(10);
        expect(component.result3).toBe(11);
        expect(resultCounter).toBe(3);

        await component.handler.whenAll();

        expect(component.resultAsync).toBe(15);
        expect(resultAsync).toBe(15);
        expect(resultAsyncCounter).toBe(2);//2 - from the first instance of the component;

        function sub() {
            component.resultChange.subscribe(e => {
                resultCounter++;
                result = e;
            });

            component.arg1Change.subscribe(e => {
                arg1Counter++;
                arg1 = e;
            });

            component.resultAsyncSomeName.subscribe(e => {
                resultAsyncCounter++;
                resultAsync = e;
            });
        }

    });

    it('Basic Normal', async () => {

        type StateD = ComponentState<TestComponentDelayed>;
        type NewStateD = ComponentStateDiff<TestComponentDelayed>;

        class TestComponentDelayed {

            constructor() {
                initializeStateTracking<TestComponentDelayed>(this,
                    {
                        immediateEvaluation: false,
                        onStateApplied: this.onNewState
                    });
            }

            public arg1: number = 0;
            public arg2: number = 0;
            public result: number = 0;
            public resultSync: number = 0;
            public resultAsync: number = 0;

            @With("arg1", "arg2")
            public static calcResult(state: StateD): NewStateD {
                return { result: state.arg1 + state.arg2 };
            }

            @With("result")
            public static calcResult2Sync(state: StateD): NewStateD {

                return { resultSync: state.result + 5 };
            }

            @WithAsync("result")
            public static async calcResult2Async(getState: () => StateD): Promise<NewStateD> {

                await delayMs(1);

                return { resultAsync: getState().result + 3 };
            }

            public onNewState(state: StateD): void {

            }
        }

        //Test

        var component = new TestComponentDelayed();

        component.arg1 = 11;
        component.arg2 = 7;

        expect(component.arg1).toBe(11);
        expect(component.arg2).toBe(7);
        expect(component.result).toBe(0);
        expect(component.resultSync).toBe(0);
        await delayMs(0);
        expect(component.arg1).toBe(11);
        expect(component.arg2).toBe(7);
        expect(component.result).toBe(18);
        expect(component.resultSync).toBe(18+5);
        expect(component.resultAsync).toBe(0);

        await delayMs(10);
        expect(component.resultAsync).toBe(18+3);
    });

    it('Shared State', () => {

        @StateTracking({ immediateEvaluation: true, includeAllPredefinedFields: true })
        class SharedState {
            public arg1: number;

            public arg2: number = 0;

            public sum: number = 0;

            public sub: number = 0;

            public mul: number = 0;

            @With("arg1", "arg2")
            public static calcSum(state: ComponentState<SharedState>): ComponentStateDiff<SharedState> {
                return {
                    sum: state.arg1 + state.arg2,
                    sub: state.arg1 - state.arg2,
                }
            }
        }

        @StateTracking<SharedStateClient1>({
            immediateEvaluation: true,
            getSharedStateTracker: (c) => c.ss
        })
        class SharedStateClient1 implements SharedState {
            constructor(public readonly ss: SharedState) {

            }

            @BindToShared()
            public arg1: number = 0;

            @BindToShared()
            public arg2: number = 0;

            @BindToShared()
            public sum: number = 0;

            public sub: number = 0;

            @BindToShared()
            public mul: number = 0;
        }

        @StateTracking<SharedStateClient2>({
            immediateEvaluation: true,
            getSharedStateTracker: (c) => c.ss,
            setHandler: (c, h) => c.onSetHandler(h)
        })
        class SharedStateClient2 implements Omit<SharedState, "sub"> {
            constructor(public readonly ss: SharedState) {

            }

            public subscription: ISharedStateChangeSubscription | null;

            public onSetHandler(handler: IStateHandler<ComponentState<SharedStateClient2>>) {
                this.subscription = handler.subscribeSharedStateChange();
            }

            @BindToShared()
            public arg1: number = 0;

            @BindToShared()
            public arg2: number = 0;

            @BindToShared()
            public sum: number = 0;

            @BindToShared<SharedState>("sub")
            public subZero: number = 0;

            @BindToShared()
            public mul: number = 0;

            public otherArg: number = 0;

            @With("arg1", "arg2")
            public static calcMul(state: ComponentState<SharedStateClient2>): ComponentStateDiff<SharedStateClient2> {
                return { mul: state.arg1 * state.arg2 };
            }

            @With("sum")
            public static onSum(state: ComponentState<SharedStateClient2>): ComponentStateDiff<SharedStateClient2> {
                return { otherArg: state.sum };
            }
        }

        const sharedState = new SharedState();

        const sharedStateClient1 = new SharedStateClient1(sharedState);

        const sharedStateClient2 = new SharedStateClient2(sharedState);


        sharedState.arg1 = 2;
        sharedStateClient2.arg2 = 3;


        expect(sharedStateClient1.arg1).toBe(2);
        expect(sharedStateClient1.arg2).toBe(3);
        expect(sharedStateClient1.sum).toBe(5);
        expect(sharedStateClient1.sub).toBe(0);//Not bound
        expect(sharedStateClient1.mul).toBe(6);

        expect(sharedStateClient2.arg1).toBe(2);
        expect(sharedStateClient2.arg2).toBe(3);
        expect(sharedStateClient2.sum).toBe(5);
        expect(sharedStateClient2.subZero).toBe(-1);

        sharedState.arg1 = 4;
        sharedState.arg2 = 3;

        expect(sharedStateClient1.arg1).toBe(4);
        expect(sharedStateClient1.arg2).toBe(3);
        expect(sharedStateClient1.sum).toBe(7);
        expect(sharedStateClient1.sub).toBe(0);//Not bound

        expect(sharedStateClient2.arg1).toBe(4);
        expect(sharedStateClient2.arg2).toBe(3);
        expect(sharedStateClient2.sum).toBe(7);
        expect(sharedStateClient2.subZero).toBe(1);


        expect(sharedStateClient2.otherArg).toBe(sharedStateClient1.sum);

        sharedStateClient2.subscription?.unsubscribe();
        expect(() => sharedStateClient2.subscription?.unsubscribe()).toThrow();

    });

    it('Multi Shared State', () => {

        @StateTracking({ immediateEvaluation: true })
        class S {
            @IncludeInState()
            public arg: number;

            @IncludeInState()
            public res: number;
        }

        @StateTracking({ immediateEvaluation: true })
        class S2 {
            @IncludeInState()
            public arg: number;

            @IncludeInState()
            public argS2: number;

            @IncludeInState()
            public res: number;

            @With("arg", "argS2")
            public static calc(s) {
                return {
                    res: s.arg + s.argS2
                }
            }
        }

        class Pro {

            public subscription: ISharedStateChangeSubscription | null; 

            public handler: IStateHandler<Pro>;

            constructor(s: Object[]) {
                this.handler = initializeStateTracking<Pro>(this, { sharedStateTracker: s, immediateEvaluation: true });
                this.subscription = this.handler.subscribeSharedStateChange();
            }

            @BindToShared<S>("arg", 0)
            public arg: number;

            @BindToShared()
            public argS2: number;

            @BindToShared<S2>("res", 1)//To S2
            public res: number = 0;
        }

        class Pro2 {
            public subscription: ISharedStateChangeSubscription | null; 

            public handler: IStateHandler<Pro2>;

            constructor(s: Object[]) {
                this.handler = initializeStateTracking<Pro2>(this, { sharedStateTracker: s, immediateEvaluation: true });
                this.subscription = this.handler.subscribeSharedStateChange();
            }

            @BindToShared<S>("arg", 1)
            public arg2: number;

            @BindToShared<S>("res", 1)
            public res: number;

            @With("arg2")
            public static calc(s) {
                return {
                    res: s.arg2 + 1
                }
            }
        }

        const s = new S();
        const s2 = new S2();
        const p = new Pro([s,s2]);
        const p2 = new Pro2([s2, s]);

        p.arg = 7;
        p.argS2 = 2;

        s2.arg = 5;

        expect(s.arg).toBe(7);
        expect(p2.arg2).toBe(7);

        expect(p.res).toBe(7);
        expect(s.res).toBe(8);
        expect(p2.res).toBe(8);

        s.arg = 11;
        s2.argS2 = 10;
        s2.arg = 7;

        expect(p.handler.getState().res).toBe(17);
        expect(p2.handler.getState().res).toBe(12);

        p.subscription?.unsubscribe();

        s.arg = 23;
        s2.argS2 = 22;
        s2.arg = 27;

        expect(p.handler.getState().res).toBe(17);//Unsubscribed
        expect(p2.handler.getState().res).toBe(23 +1);//S.res

        p2.subscription?.unsubscribe();

        s.arg = 100;
        expect(p2.handler.getState().res).toBe(23 + 1);//S.res unsubscribed

    });

    it('Debounce Emitter', async () => {

        type State = ComponentState<Component>;
        type NewState = ComponentStateDiff<Component>;

        class Component {

            public handler: IStateHandler<any>;

            constructor() {
                this.handler = initializeStateTracking(this);
            }

            @Emitter()
            arg: number = 5;

            result: number = 0;

            resultAsync: number = 0;

            @With("arg").Debounce(10)
            public static calcResult(state: State): NewState {
                return {
                    result: state.arg + 1
                }
            }

            @WithAsync("arg").Debounce(10)
            public static async calcAsyncResult(getState: () => State): Promise<NewState> {
                await delayMs(1);
                return {
                    resultAsync: getState().arg + 1
                }
            }
        }

        var component = new Component();

        component.arg = 6;
        await delayMs(1);
        component.arg = 5;

        await component.handler.whenAll();

        expect(component.result).toBe(6);
        expect(component.resultAsync).toBe(6);

    });

    it("Rollback Modification",
        async () => {
            @StateTracking()
            class T {
                public val: number = 0;
                public val2: number = 0;

                @With("val")
                public static onVal(state: ComponentState<T>): ComponentStateDiff<T> {

                    if (state.val > 100) {
                        return null;
                    }

                    return { val: 0 };
                }
            }


            var t = new T();

            t.val = 1;

            await delayMs(1);

            expect(t.val).toBe(0);

        });

    it("Include All PreDefined Fields", () => {

        @StateTracking({ includeAllPredefinedFields: true, immediateEvaluation: true })
        class Shared {
            public sharedMember: string | null = null;
        }

        const s = new Shared();

        class C {

            public readonly handler: IStateHandler<ComponentState<C>>;

            constructor(allPreDefined: boolean) {
                this.handler = initializeStateTracking(this,
                    {
                        includeAllPredefinedFields: allPreDefined,
                        immediateEvaluation: true,
                        sharedStateTracker: s
                    });
            }

            public defined = 17;

            public notDefined: number;

            @BindToShared()
            public sharedMember: string | null;
        }

        let c = new C(false);
        c.notDefined = 100;
        expect(c.sharedMember).toBe(null);
        c.sharedMember = "Shared";
        expect(s.sharedMember).toBe("Shared");

        let state = (c.handler as IStateHandler<ComponentState<C>>).getState();
        expect(state.defined).toBeUndefined();
        expect(state.notDefined).toBeUndefined();
        expect(c.defined).toBe(17);
        expect(c.notDefined).toBe(100);

        c = new C(true);
        c.notDefined = 100;
        state = (c.handler as IStateHandler<ComponentState<C>>).getState();
        expect(state.defined).toBe(17);
        expect(state.notDefined).toBeUndefined();
        expect(c.defined).toBe(17);
        expect(c.notDefined).toBe(100);
    });


    it("Discard Async", async () => {

        class C {

            private readonly _handler: IStateHandler<ComponentState<C>>;

            constructor() {
                this._handler = initializeStateTracking<C>(this, { immediateEvaluation: true });
            }

            public getHandler(): IStateHandler<ComponentState<C>> {
                return this._handler;
            }

            public arg: number = 0;

            public arg2: number = 0;

            @With("arg").Debounce(10)
            static modifier1(state: ComponentState<C>): ComponentStateDiff<C> {
                if (state.arg === 19) {
                    return null;
                }
                return { arg: state.arg + 1 };
            }

            @WithAsync("arg2")
            static async modifier2(getState: ()=> ComponentState<C>): Promise<ComponentStateDiff<C>> {
                await delayMs(10);
                if (getState().arg2 === 30) {
                    return null;
                }
                return { arg2: getState().arg2 + 1 };
            }
        }

        const c = new C();

        c.arg = 17;
        c.arg2 = 17;

        await delayMs(50);//Several passes
        c.getHandler().release();
        await delayMs(150);//Several passes
        expect(c.arg).toBe(19);
        expect(c.arg2).toBeLessThan(25);
    });

    it("Dispose Subscriptions", ()=> {
        @StateTracking({ includeAllPredefinedFields: true, immediateEvaluation: true })
        class Shared {
            public sharedMember: string | null = null;
        }

        const s = new Shared();

        @StateTracking<C>({
            immediateEvaluation: true,
            getSharedStateTracker: () => s,
            setHandler: (c, h) => c.handler = h
        })
        class C {

            handler: IStateHandler<C>;
            
            @BindToShared()
            sharedMember: string | null = null;

            @Calc(["sharedMember"], s => s.sharedMember + ((s as any).depOnShared??"") + "_2")
            depOnShared: string | null = null;
        }

        const c = new C();

        s.sharedMember = "Value1";
        expect(c.depOnShared).toBe(null);

        let subsc = c.handler.subscribeSharedStateChange();

        expect(() => c.handler.subscribeSharedStateChange()).toThrow();

        s.sharedMember = "Value2";

        expect(c.depOnShared).toBe("Value2_2");

        releaseStateTracking(c);
        releaseStateTracking(c);

        expect(() => subsc?.unsubscribe()).toThrow();

        s.sharedMember = "Value3";

        expect(c.depOnShared).toBe("Value2_2");

        subsc = c.handler.subscribeSharedStateChange();

        s.sharedMember = "Value4";

        expect(c.depOnShared).toBe("Value4Value2_2_2");

        subsc?.unsubscribe();

        s.sharedMember = "Value5";

        expect(c.depOnShared).toBe("Value4Value2_2_2");
    });

    it("Counter Test  - onStateApplied to stack", async () => {

        class CounterState{
            constructor(){
                initializeStateTracking(this, {immediateEvaluation: true, includeAllPredefinedFields: true});
            }

            counter: number = 0;
        }

        class Component implements CounterState {
            constructor(id: string, cs: CounterState){
                this.id = id;
                const h = initializeStateTracking(this, {immediateEvaluation: true, sharedStateTracker:[cs]});

                h.subscribeSharedStateChange();
            }

            @IncludeInState()
            readonly id: string

            @BindToShared()
            counter: number = 0;

            @IncludeInState()
            isEmpty: boolean = false;

            @IncludeInState()
            isInit: boolean = false;

            @IncludeInState()
            isError: boolean = false;


            @With("isEmpty", "isInit")
            static er(s: ComponentState<Component>): ComponentStateDiff<ComponentState<Component>>{
                return {
                    isError: s.isEmpty && s.isInit
                };
            }

            @With("isError")
            static inc(s: ComponentState<Component>): ComponentStateDiff<ComponentState<Component>>{
                if(s.isError){
                    return {
                        counter: s.counter+1
                    };    
                }
                else{
                    return {
                        counter: s.counter-1
                    };
                }
            }
        }

        class ComponentHost implements CounterState {

            controls: Component[] = [];

            constructor(cs: CounterState){
                initializeStateTracking(this, {
                    immediateEvaluation: true,
                    sharedStateTracker: [cs],
                    onStateApplied: ()=> {
                        let f: Component| null = null;
                        for(const c of this.controls) {
                            if(f == null){
                                f = c;
                            }
                            else {
                                c.isInit = f.isInit;
                            }
                        }
                    }
                }).subscribeSharedStateChange();
            }

            @BindToShared()
            counter: number = 0;
        }

        const s = new CounterState();

        const cHost = new ComponentHost(s);
        const c1 = new Component("1", s);
        const c2 = new Component("2", s);
        cHost.controls = [c1,c2];

        c1.isInit = false;
        c2.isInit = false;

        c1.isEmpty = true;
        c2.isEmpty = true;

        await delayMs(2);

        c1.isInit = true;
        c1.isEmpty = false;

        c2.isInit = true;
        c2.isEmpty = true;

        expect(c1.counter).toBe(1);
        expect(c2.counter).toBe(1);
        expect(cHost.counter).toBe(1);
    });
});