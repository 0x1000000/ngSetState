import { } from "jasmine";
import { BehaviorSubject, Subject } from "rxjs";
import { BindToShared, ComponentState, ComponentStateDiff, Emitter, initializeStateTracking, IStateHandler, releaseStateTracking, StateTracking, With, WithAsync } from "../src";
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
});
