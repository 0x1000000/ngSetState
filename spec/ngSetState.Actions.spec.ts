import { } from "jasmine";
import { Subject } from "rxjs";
import { ComponentState, ComponentStateDiff, IncludeInState, initializeImmediateStateTracking, IStateHandler, With, WithActionAsync } from "../src";
import { AsyncContext, StateActionBase } from "../src/api/common";
import { WithAction } from "../src/api/state_decorators/with";
import { initializeStateTracking, StateDiff } from "../src/api/state_tracking";
import { delayMs } from "./helpers";

describe('Actions...', () => {
    it ('Basic test', async () => {
        class ActionSetName extends StateActionBase {
            constructor(readonly name: string){
                super();
            }
        }

        class State {

            stateHandler: IStateHandler<State>;

            readonly greeting: string;

            readonly nameCapitalized: string = "Initial";

            @IncludeInState()
            readonly debounceCounter: number = 0;

            constructor() {
                this.stateHandler = initializeImmediateStateTracking<State>(this);
            }

            @WithAction(ActionSetName)
            static setName(a: ActionSetName, s: ComponentState<State>): ComponentStateDiff<State> {
                return {
                    nameCapitalized: a.name?.toUpperCase()
                };
            }

            @WithAction(ActionSetName).Debounce(50)
            static setName50(a: ActionSetName, s: ComponentState<State>): ComponentStateDiff<State> {
                return {
                    nameCapitalized: a.name?.toUpperCase() + '50ms',
                    debounceCounter: s.debounceCounter + 1
                };
            }

            @With('nameCapitalized', 'debounceCounter').CallOnInit()
            static createGreeting(s: ComponentState<State>): ComponentStateDiff<State> {
                return {
                    greeting: `Hi, ${s.nameCapitalized}!`
                };
            }
        }

        const s = new State();

        expect(s.greeting).toBe('Hi, Initial!');

        s.stateHandler.execAction(new ActionSetName('Alice'));


        expect(s.nameCapitalized).toBe('ALICE');
        expect(s.greeting).toBe('Hi, ALICE!');

        await delayMs(1);

        s.stateHandler.execAction(new ActionSetName('Bob'));

        expect(s.nameCapitalized).toBe('BOB');
        expect(s.greeting).toBe('Hi, BOB!');
      
        await s.stateHandler.whenAll();

        expect(s.nameCapitalized).toBe('BOB50ms');
        expect(s.greeting).toBe('Hi, BOB50ms!');
        expect(s.debounceCounter).toBe(1);
    });

    it ('Async test', async () => {
        class ActionA extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionB extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionC extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        let replaceCanceledCounter = 0;
        let canceledCanceledCounter = 0;
        class State {

            stateHandler: IStateHandler<State>;

            readonly valueA: number;
            readonly valueB: number;
            readonly valueC: number;

            @IncludeInState()
            readonly debounceCounter: number = 0;

            constructor() {
                this.stateHandler = initializeImmediateStateTracking<State>(this);
            }

            @WithActionAsync(ActionA).OnConcurrentLaunchPutAfter()
            static async setValueA(a: ActionA, s: AsyncContext<State>): Promise<ComponentStateDiff<State>> {
                await delayMs(100);
                return {
                    valueA: a.value,
                    debounceCounter: s().debounceCounter + 1
                };
            }

            @WithActionAsync(ActionB).OnConcurrentLaunchCancel()
            static async setValueB(a: ActionB, s: AsyncContext<State>): Promise<ComponentStateDiff<State>> {
                await delayMs(100);
                if(s.isCancelled()){
                    canceledCanceledCounter++;
                }
                return {
                    valueB: a.value,
                    debounceCounter: s().debounceCounter + 1
                };
            }

            @WithActionAsync(ActionC).OnConcurrentLaunchReplace()
            static async setValueC(a: ActionC, s: AsyncContext<State>): Promise<StateDiff<State>> {
                await delayMs(100);

                if(s.isCancelled()){
                    replaceCanceledCounter++;
                }
                return {
                    valueC: a.value,
                    debounceCounter: s().debounceCounter + 1
                };
            }
        }

        const s = new State();

        s.stateHandler.execAction(new ActionA(10));
        s.stateHandler.execAction(new ActionB(10));
        s.stateHandler.execAction(new ActionC(10));

        await delayMs(1);

        s.stateHandler.execAction(new ActionA(20));
        s.stateHandler.execAction(new ActionB(20));
        s.stateHandler.execAction(new ActionC(20));

        await delayMs(1);

        s.stateHandler.execAction(new ActionA(30));
        s.stateHandler.execAction(new ActionB(30));
        s.stateHandler.execAction(new ActionC(30));

        await s.stateHandler.whenAll();


        expect(s.valueA).toBe(30);
        expect(s.valueB).toBe(10);
        expect(s.valueC).toBe(30);
        expect(s.debounceCounter).toBe(4);
        expect(canceledCanceledCounter).toBe(0);
        expect(replaceCanceledCounter).toBe(2);
    });    


    it ('Chain test', async () => {
        class ActionA extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionB extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionC extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class Component {
            
            readonly handler: IStateHandler<Component>;

            constructor() {
                this.handler = initializeImmediateStateTracking<Component>(this);
            }

            counter: number = 0;

            @WithAction(ActionA)
            static actionA(a: ActionA, s: ComponentState<Component>): StateDiff<Component> {
                return [{
                    counter: s.counter + a.value
                }, new ActionB(2), new ActionC(3)];
            }

            @WithAction(ActionB)
            static actionB(a: ActionB, s: ComponentState<Component>): StateDiff<Component> {
                return [{
                    counter: s.counter + a.value
                }, new ActionC(10)];
            }

            @WithAction(ActionC)
            static actionC(a: ActionC, s: ComponentState<Component>): StateDiff<Component> {
                return [{
                    counter: s.counter + a.value
                }];
            }

            @WithActionAsync(ActionC)
            static async actionCa(a: ActionC, s: AsyncContext<Component>): Promise<StateDiff<Component>> {
                await delayMs(10);

                const counter = s().counter;
                return [{
                    counter: -50 + counter
                }];
            }
        }


        const c = new Component();

        c.handler.execAction(new ActionA(1));

        expect(c.counter).toBe(16);

        await c.handler.whenAll();

        expect(c.counter).toBe(-84);
    });

    it ('Shared test', async () => {
        class ActionA extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionB extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionGlobal extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class Service {

            serviceValue: number = 0;

            constructor() {
                initializeImmediateStateTracking<Service>(this);
            }

            @WithAction(ActionA)
            static onActionA(a: ActionA, s: ComponentState<Service>): StateDiff<Service> {
                return {
                    serviceValue: s.serviceValue + a.value
                }
            }

            @WithAction(ActionB)
            static onActionB(a: ActionA, s: ComponentState<Service>): StateDiff<Service> {
                return [{
                    serviceValue: s.serviceValue + a.value
                }, new ActionGlobal(a.value)];
            }
        }

        class Component {
            
            readonly handler: IStateHandler<Component>;

            constructor(service: Service) {
                this.handler = initializeImmediateStateTracking<Component>(this, {sharedStateTracker: service});
                this.handler.subscribeSharedStateChange();
            }

            readonly componentValue = new Subject<number>();

            readonly globalValue: number;

            @With('componentValue')
            static withValue(s: ComponentState<Component>): StateDiff<Component> {
                return [new ActionA(s.componentValue ?? 0), new ActionB((s.componentValue ?? 0)/2)];
            }

            @WithAction(ActionGlobal)
            static onGlobalAction(a: ActionGlobal): StateDiff<Component> {
                return {
                    globalValue: a.value
                };
            }
        }

        const service = new Service();
        const component1 = new Component(service);
        const component2 = new Component(service);

        component1.componentValue.next(10);

        expect(component1.globalValue).toBe(5);

        component2.componentValue.next(20);

        expect(service.serviceValue).toBe(45);

        expect(component1.globalValue).toBe(10);

        component1.handler.release();
        component2.handler.release();
    });    

    it ('Shared test not immediate', async () => {
        class ActionA extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class ActionB extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class Service {

            serviceValue: number = 0;

            constructor() {
                initializeStateTracking<Service>(this, {includeAllPredefinedFields: true});
            }

            @WithAction(ActionA)
            static onActionA(a: ActionA, s: ComponentState<Service>): StateDiff<Service> {
                return {
                    serviceValue: s.serviceValue + a.value
                }
            }

            @WithAction(ActionB)
            static onActionB(a: ActionA, s: ComponentState<Service>): StateDiff<Service> {
                return {
                    serviceValue: s.serviceValue + a.value
                }
            }
        }

        class Component {
            
            readonly handler: IStateHandler<Component>;

            constructor(service: Service) {
                this.handler = initializeStateTracking<Component>(this, {sharedStateTracker: service, includeAllPredefinedFields: true});
            }

            readonly componentValue = new Subject<number>();

            @With('componentValue')
            static withValue(s: ComponentState<Component>): StateDiff<Component> {
                return [new ActionA(s.componentValue ?? 0), new ActionB((s.componentValue ?? 0)/2)];
            }
        }


        const service = new Service();
        const component1 = new Component(service);
        const component2 = new Component(service);

        component1.componentValue.next(10);
        component2.componentValue.next(20);

        expect(service.serviceValue).toBe(0);

        await delayMs(10);

        expect(service.serviceValue).toBe(45);

        component1.handler.release();
        component2.handler.release();
    });    

    it ('Infinite loop brake', async () => {
        class ActionA extends StateActionBase {
            constructor(readonly value: number){
                super();
            }
        }

        class Component {
            
            readonly handler: IStateHandler<Component>;

            err: any;

            constructor() {
                this.handler = initializeImmediateStateTracking<Component>(this, {errorHandler: (e)=> {
                    this.err = e;
                    return true;
                }});
            }

            readonly componentValue = new Subject<number>();

            @With('componentValue')
            static withValue(s: ComponentState<Component>): StateDiff<Component> {
                return [new ActionA(s.componentValue ?? 0)];
            }

            @WithAction(ActionA)
            static withActionA(s: ComponentState<Component>): StateDiff<Component> {
                return [new ActionA(s.componentValue ?? 0)];
            }
        }

        const component1 = new Component();

        component1.componentValue.next(10);

        expect(component1.err).toBeTruthy();
    });    

});
