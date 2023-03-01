import { } from "jasmine";
import { BehaviorSubject, Subject } from "rxjs";
import { BindToShared, ComponentState, ComponentStateDiff, Emitter, IncludeInState, initializeImmediateStateTracking, initializeStateTracking, IStateHandler, releaseStateTracking, StateTracking, With, WithAsync, WithSharedAsSource, WithSharedAsSourceArg, WithSharedAsTarget, WithSharedAsTargetArg } from "../src";
import { delayMs, EventEmitter } from "./helpers";

describe('Observers...', () => {
    it ('Emitter basic test', async () => {

        @StateTracking({immediateEvaluation: true, includeAllPredefinedFields: true})
        class EmitterTest {
            arg = 0;

            @Emitter()
            click = new EventEmitter<void>();

            mul2 = new EventEmitter<any>();
        
            @With('arg')
            static calcResult(s: ComponentState<EmitterTest>): ComponentStateDiff<EmitterTest>
            {
                return {
                    mul2: s.arg*2,
                    click: undefined
                };
            }
        }
        
        const c = new EmitterTest();

        let result = 0;
        let clicked = 0;
        c.mul2.subscribe(r => result = r);
        c.click.subscribe(() => clicked++);

        c.arg = 2;

        expect(result).toBe(4);
        expect(clicked).toBe(1);
    });

    it ('Emitter with dependency test', async () => {

        @StateTracking<EmitterTest>({
            immediateEvaluation: true, 
            includeAllPredefinedFields: true,
            setHandler: (c, v) => c.handler = v
        })
        class EmitterTest {
            arg = 0;

            @Emitter()
            click = new EventEmitter<void>();

            mul2 = new EventEmitter<any>();

            handler: IStateHandler<EmitterTest>;
        
            @With('arg').Debounce(10/*ms*/)
            static calcResult(s: ComponentState<EmitterTest>): ComponentStateDiff<EmitterTest>
            {
                return {
                    mul2: s.arg*2,
                    click: undefined,
                };
            }

            @With('click').Debounce(10/*ms*/)
            static onClick(s: ComponentState<EmitterTest>): ComponentStateDiff<EmitterTest> {
                return {
                    mul2: s.mul2 + 1
                }
            }
        }
        
        const c = new EmitterTest();

        let result = 0;
        let clicked = 0;
        c.mul2.subscribe(r => result = r);
        c.click.subscribe(() => clicked++);

        c.arg = 2;

        await c.handler.whenAll();

        expect(result).toBe(5);
        expect(clicked).toBe(1);
    });

    it('SharedObservables', async () => {
        class SharedObservablesClient {

            @BindToShared()
            public arg1 = 0;
        
            @BindToShared()
            public arg2 = 0;
        
            @BindToShared()
            public result = 0;
        
            public resultStr = 0;
        
            constructor(service: SharedObservables) {
                initializeStateTracking(this, {sharedStateTracker: service, immediateEvaluation: true })
                    .subscribeSharedStateChange();
            }   
        
            public release() {
                releaseStateTracking(this);
            }
        
            @With('result')
            static produceResult(s: ComponentState<SharedObservablesClient>): ComponentStateDiff<SharedObservablesClient> {
                return {
                    resultStr: s.result + 2,           
                }
            }
        }
        
        class SharedObservables {
            public arg1 = new Subject<number>();
        
            public arg2 = 0;
        
            public result = new Subject<number>();

            public p = new Subject<number>()
        
            constructor() {
                initializeStateTracking(this, { immediateEvaluation: true })
            }
        
            @With('arg1', 'arg2')
            static calc(state: ComponentState<SharedObservables>): ComponentStateDiff<SharedObservables> {
                return { result: (state.arg1??0) + state.arg2 };
            }
        }

        const service = new SharedObservables();

        const component = new SharedObservablesClient(service);

        service.arg1.next(2);
        expect(component.arg1).toBe(2);
        service.arg2 = 3;
        expect(component.arg2).toBe(3);

        expect(component.result).toBe(5);
        expect(component.resultStr).toBe(7);

        component.release();

        let serviceResult = 0;
        service.result.subscribe(r => serviceResult = r);

        service.arg1.next(4);
        service.arg2 = 8;


        expect(serviceResult).toBe(12);

        expect(component.result).toBe(5);
        expect(component.resultStr).toBe(7);

        //From client to service

        component.result = 77;

        expect(serviceResult).toBe(77);
    });

    it('ComponentWithMixedArguments', async () => {

        class ComponentWithMixedArguments {
            arg1 = 0;
        
            arg2 = new Subject<number>();
        
            result = 0;
        
            constructor() {
                initializeStateTracking(this, { 
                    immediateEvaluation: true, 
                    includeAllPredefinedFields: true 
                });    
            }
        
            @With('arg1','arg2')
            static calc(s: ComponentState<ComponentWithMixedArguments>): ComponentStateDiff<ComponentWithMixedArguments> {    
                return {result: s.arg1 + (s.arg2 ?? 0)};
            }
        }
        
        const c = new ComponentWithMixedArguments();
        c.arg1 = 2;
        c.arg2.next(3);
        expect(c.result).toBe(5);
        c.arg2.next(4);
        expect(c.result).toBe(6);
        c.arg1 = 3;
        expect(c.result).toBe(7);        
    });

    it('Async Recursive Result', async () => {

        class ComponentWithAsyncResult {

            val: string = "AA";
        
            arg1 = new BehaviorSubject<number>(0);
        
            arg2 = new Subject<number>();
        
            result = new Subject<number>();
        
            constructor() {
                initializeStateTracking(this, { 
                    immediateEvaluation: true, 
                    includeAllPredefinedFields: true 
                });
            }
        
            release() {
                releaseStateTracking(this);
            }
        
            @With('arg1','arg2')
            static calc(s: ComponentState<ComponentWithAsyncResult>): ComponentStateDiff<ComponentWithAsyncResult> {    
                return { result: (s.arg1 ?? 0) + (s.arg2 ?? 0) };
            }   
        
            @WithAsync('result')
            static async calcAfter(getState: () => ComponentState<ComponentWithAsyncResult>): Promise<ComponentStateDiff<ComponentWithAsyncResult>> {
                //await delayMs(0);
                const s = getState();
                if((s.result??0) < 10) {
                    return { arg1: (s.arg1??0)+1 };
                }
                return null;
            }    
        }

        const c = new ComponentWithAsyncResult();
        let resValue: number|undefined;
        c.result.subscribe(r => resValue = r);

        c.arg1.next(2)
        c.arg2.next(3);

        await delayMs(0);

        expect(resValue).toBe(10);
    });


    it('Shared observables through modifyState', async () => {
        @StateTracking({ immediateEvaluation: true })
        class Service {
            @IncludeInState()
            public value = new Subject<number>();
        }
        
        class Client {

            @BindToShared()
            value: number;

            stateHandler: IStateHandler<Client>;

            constructor(s: Service) {
                this.stateHandler = initializeImmediateStateTracking<Client>(this, {sharedStateTracker: s});
            }            
        }

        const service = new Service();

        let sv;

        service.value.subscribe(v => sv = v);

        const client = new Client(service);

        client.stateHandler.modifyStateDiff({value: 17});

        expect(sv).toBe(17);

    });

    it('WithSharedAsSource', async () => {
        class SharedObservables1 {
            public arg1 = new Subject<number>();
        
            public arg2 = 0;
        
            public result = new Subject<number>();
       
            constructor() {
                initializeImmediateStateTracking(this);
            }
        
            @With('arg1', 'arg2')
            static calc(state: ComponentState<SharedObservables1>): ComponentStateDiff<SharedObservables1> {
                return { result: (state.arg1??0) + state.arg2 };
            }
        }

        class SharedObservables2 {
            public arg1 = new Subject<number>();
        
            public arg2 = 0;
        
            public result = new Subject<number>();
       
            constructor() {
                initializeImmediateStateTracking(this)
            }
        
            @With('arg1', 'arg2')
            static calc(state: ComponentState<SharedObservables1>): ComponentStateDiff<SharedObservables1> {
                return { result: (state.arg1??0) + state.arg2 };
            }
        }

        class SharedObservablesClient {

            public resultSrv1Plus2Mul2 = 0;

            public resultSrv1Plus2Mul2Plus3 = 0;

            public resultSrv2 = 0;
        
            constructor(service: SharedObservables1, service2: SharedObservables2) {
                initializeImmediateStateTracking(this, { sharedStateTracker: [service, service2] })
                    .subscribeSharedStateChange();
            }   
        
            public release() {
                releaseStateTracking(this);
            }
        
            @WithSharedAsSource(SharedObservables1, 'result').CallOnInit()
            static produceResult(s: WithSharedAsSourceArg<SharedObservablesClient, SharedObservables1>): ComponentStateDiff<SharedObservablesClient> {
                return {
                    resultSrv1Plus2Mul2: (s.currentSharedState.result ?? 0) + 2
                };
            }

            @WithSharedAsSource(SharedObservables1, 'result')
            static produceResult2(s: WithSharedAsSourceArg<SharedObservablesClient, SharedObservables1>): ComponentStateDiff<SharedObservablesClient> {
                return {
                    resultSrv1Plus2Mul2: (s.currentSharedState.result ?? 0) + s.currentState.resultSrv1Plus2Mul2
                };
            }

            @With('resultSrv1Plus2Mul2')
            static incResult(s: ComponentState<SharedObservablesClient>): ComponentStateDiff<SharedObservablesClient> {
                return {
                    resultSrv1Plus2Mul2Plus3: s.resultSrv1Plus2Mul2  + 3
                };
            }

            @WithSharedAsSource(SharedObservables2, 'result')
            static produceResultS2(s: WithSharedAsSourceArg<SharedObservablesClient, SharedObservables2>): ComponentStateDiff<SharedObservablesClient> {
                return {
                    resultSrv2: s.currentSharedState.result
                };
            }
        }

        const service = new SharedObservables1();
        const service2 = new SharedObservables2();
 
        const component = new SharedObservablesClient(service, service2);

        expect(component.resultSrv1Plus2Mul2).toBe(2);

        service.arg1.next(1);
        let service1Result: number = -1;
        service.result.subscribe(r => service1Result = r);
        service.arg2 = 2;

        expect(service1Result).toBe(3);
        expect(component.resultSrv1Plus2Mul2).toBe(8);
        expect(component.resultSrv1Plus2Mul2Plus3).toBe(11);

        let service2Result: number = -1;
        service2.result.subscribe(r => service2Result = r);
        service2.arg1.next(10);
        service2.arg2 = 20;

        expect(service2Result).toBe(30);
        expect(component.resultSrv2).toBe(30);
    });

    it('WithSharedAsTarget', async () => {

        class Service1 {
            result = new Subject<number>();

            constructor() {
                initializeImmediateStateTracking(this);
            }            
        }

        class Service2 {
            result = new Subject<number>();

            constructor() {
                initializeImmediateStateTracking(this);
            }            
        }

        class Client {
            arg1: number = 0;

            arg2: number = 0;

            intermediateResult: number;

            handler: IStateHandler<Client>;

            constructor(service1: Service1, service2: Service2) {
                this.handler = initializeImmediateStateTracking<Client>(this, {sharedStateTracker: [service1, service2]});

                this.handler.subscribeSharedStateChange();
            }            

            @WithSharedAsTarget(Service1, 'arg1', 'arg2')
            static sum(arg: WithSharedAsTargetArg<Client, Service1>): ComponentStateDiff<Service1> {    
                return {result: arg.currentState.arg1 + arg.currentState.arg2};
            }

            @WithSharedAsSource(Service1, 'result')
            static onResult(arg: WithSharedAsSourceArg<Client, Service1>): ComponentStateDiff<Client> {    
                return {
                    intermediateResult: arg.currentSharedState.result
                };
            }

            @WithSharedAsTarget(Service1, 'intermediateResult')
            static sum2(arg: WithSharedAsTargetArg<Client, Service1>): ComponentStateDiff<Service1> {

                if(arg.currentState.intermediateResult === arg.currentState.arg1 + arg.currentState.arg2) {
                    return {
                        result: arg.currentState.intermediateResult + 2
                    }
                }
                return null;
            }

            @WithSharedAsTarget(Service2, 'intermediateResult')
            static toS2(arg: WithSharedAsTargetArg<Client, Service2>): ComponentStateDiff<Service2> {    
                return { result: arg.currentState.intermediateResult + 4 };
            }
        }

        const service = new Service1();
        const service2 = new Service2();

        let result: number = -1;
        let result2: number = -1;

        service.result.subscribe(r => result = r);
        service2.result.subscribe(r => result2 = r);

        const client = new Client(service, service2);

        client.arg1 = 2;
        expect(result).toBe(4);
        expect(result2).toBe(6);
        client.handler.modifyStateDiff({arg2: 3});

        expect(result).toBe(7);
        expect(result2).toBe(9);
    });
});
