import { } from "jasmine";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { 
    AsyncContext,
    AsyncInit,
    BindToShared,
    ComponentState,
    getStateHandler,
    initializeImmediateStateTracking,
    IStateHandler,
    releaseStateTracking,
    StateActionBase,
    StateDiff,
    With,
    WithAction,
    WithAsync,
    WithSharedAsSource,
    WithSharedAsSourceArg,
    WithSharedAsTarget,
    WithSharedAsTargetArg } from "./../src";
import { delayMs } from "./helpers";

describe('Demo', ()=> {

    const logs: string[] = [];

    function log(message: string) {
        logs.push(message);
        //console.log(message);        
    }

    function popLog(expectedMessage: string) {
        expect(logs.pop()).toBe(expectedMessage);
    }


    it('Basic', async ()=> {
        class Component {
            constructor() {
                initializeImmediateStateTracking(this);
            }
        
            arg1: number = 0;
        
            arg2: number = 0;
        
            readonly sum: number = 0;
        
            readonly resultString: string = '';
        
            @With('arg1', 'arg2')
            static calcSum(state: ComponentState<Component>): StateDiff<Component> {
                return {
                    sum: state.arg1 + state.arg2
                };
            }
        
            @With('sum')
            static prepareResultString(state: ComponentState<Component>): StateDiff<Component> {
                return {
                    resultString: `Result: ${state.sum}`
                };
            }    
        }
        
        const component = new Component();
        
        component.arg1 = 3;
        log(component.resultString);
        popLog("Result: 3");
        
        component.arg2 = 2;
        log(component.resultString);
        popLog("Result: 5");
    });

    it('Shared Components', async () => {

        class SharedComponent {
            value: number = 0;

            constructor() {
                initializeImmediateStateTracking(this);
            }
        }

        class Component {
                        
            message = '';

            componentValue = 0;

            @BindToShared(SharedComponent, 'value')
            sharedValue: number;

            constructor(shared: SharedComponent) {
                initializeImmediateStateTracking(this, {
                    sharedStateTracker: shared
                }).subscribeSharedStateChange();
            }

            onDestroy() {
                releaseStateTracking(this);
            }

            @WithSharedAsSource(SharedComponent, 'value').CallOnInit()
            static onValueChange(arg: WithSharedAsSourceArg<Component, SharedComponent>): StateDiff<Component> {
                return {
                    message: `Shared value is ${arg.currentSharedState.value}`
                };
            }

            @WithSharedAsTarget(SharedComponent, 'componentValue')
            static onCmpValueChange(arg: WithSharedAsTargetArg<Component, SharedComponent>): StateDiff<SharedComponent> {
                return {
                    value: arg.currentState.componentValue * 10
                };
            }
        }

        const sharedComponent = new SharedComponent();
        const component = new Component(sharedComponent);

        log(component.message);
        popLog("Shared value is 0");

        sharedComponent.value = 7;
        log(component.message);
        popLog("Shared value is 7");

        component.componentValue = 10;
        log(component.message);
        popLog("Shared value is 100");

        component.sharedValue = 10;
        log(component.message);
        popLog("Shared value is 10");
    });

    it('Async', async () => {
        class Component {

            name = '';

            greetingFormat = '';

            greeting = '';

            constructor() {
                initializeImmediateStateTracking(this);
            }

            @AsyncInit().Locks('init')
            static async init(getState: AsyncContext<Component>): Promise<StateDiff<Component>> {
                await delayMs(100);

                return {
                    greetingFormat: 'Hi, %USER%!'
                };
            }

            @WithAsync('name').Locks('init')
            static async createGreeting(getState: AsyncContext<Component>): Promise<StateDiff<Component>> {

                await delayMs(10);

                const state = getState();

                return {
                    greeting: state.greetingFormat.replace('%USER%', state.name)
                };
            }
        }

        const component = new Component();

        component.name = 'Joe';

        await getStateHandler(component).whenAll();

        log(component.greeting);
        popLog("Hi, Joe!");
    });

    it('Actions', async () => {

        class ActionA extends StateActionBase {
            constructor(readonly message: string) {
                super();
            }
        }

        class ActionB extends StateActionBase {
            constructor(readonly message: string) {
                super();
            }
        }

        class ActionS extends StateActionBase {
            constructor(readonly message: string) {
                super();
            }
        }

        type Logger = {
            log: (s: string) => void;
        }

        class SharedComponent {
            stateHandler: IStateHandler<SharedComponent>;

            constructor(readonly logger: Logger) {
                this.stateHandler = 
                    initializeImmediateStateTracking<SharedComponent>(this);
            }

            @WithAction(ActionS)
            static onActionS(action: ActionS, state: ComponentState<SharedComponent>)
                : StateDiff<SharedComponent> {

                    state.logger.log(`Action S with arg "${action.message}"`);

                return [new ActionB(action.message + ' from Shared')];
            }
        }

        class Component {
            arg = ''

            stateHandler: IStateHandler<Component>;

            constructor(readonly logger: Logger,sharedComponent: SharedComponent) {

                this.stateHandler
                    = initializeImmediateStateTracking<Component>(this, {
                        sharedStateTracker: sharedComponent
                    });

                this.stateHandler.subscribeSharedStateChange();
            }

            onDestroy() {
                this.stateHandler.release();
            }

            @With('arg')
            static onNameChange(state: ComponentState<Component>): StateDiff<Component> {
                return [new ActionA(state.arg)];
            }

            @WithAction(ActionA)
            static onActionA(action: ActionA, state: ComponentState<Component>): StateDiff<Component> {

                state.logger.log(`Action A with arg "${action.message}"`);

                return [new ActionB(action.message), new ActionS(action.message)];
            }

            @WithAction(ActionB)
            static onActionB(action: ActionB, state: ComponentState<Component>): StateDiff<Component> {
                state.logger.log(`Action B with arg "${action.message}"`);
                return null;
            }
        }

        const logger: Logger = {
            log: (m) => log(m)
        };

        const sharedComponent = new SharedComponent(logger);

        const component = new Component(logger, sharedComponent);

        component.arg = "arg1";
        popLog("Action B with arg \"arg1 from Shared\"");
        popLog("Action S with arg \"arg1\"");
        popLog("Action B with arg \"arg1\"");
        popLog("Action A with arg \"arg1\"");

        component.stateHandler.execAction(new ActionS('arg2'));
        popLog("Action B with arg \"arg2 from Shared\"");
        popLog("Action S with arg \"arg2\"");

        sharedComponent.stateHandler.execAction(new ActionA('arg3'));
        popLog("Action B with arg \"arg3\"");
        popLog("Action A with arg \"arg3\"");
    });

    it('Observables', async () => {

        class Component {

            sum: Subject<number>;

            constructor(readonly arg1: Observable<number>,readonly  arg2: Observable<number>) {

                this.sum = new Subject<number>();

                initializeImmediateStateTracking<Component>(this);
            }

            destroy() {
                releaseStateTracking(this);
            }

            @With<Component>('arg1', 'arg2')
            static calcSum(s: ComponentState<Component>): StateDiff<Component> {
                return {
                    sum: (s.arg1??0) +(s.arg2??0)
                };
            }
        }

        const arg1 = new BehaviorSubject<number>(0);
        const arg2 = new BehaviorSubject<number>(0);

        const component = new Component(arg1, arg2);

        let sum: number = 0;
        component.sum.subscribe( s=> sum = s);

        arg1.next(2);
        
        log(sum.toString())
        popLog("2");

        arg2.next(3);
        
        log(sum.toString())
        popLog("5");

        arg2.next(10);
        
        log(sum.toString())
        popLog("12");
    });
});
