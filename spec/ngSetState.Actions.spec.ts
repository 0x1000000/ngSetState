import { } from "jasmine";
import { ComponentState, ComponentStateDiff, IncludeInState, initializeImmediateStateTracking, IStateHandler, With, WithActionAsync } from "../src";
import { AsyncContext, StateActionBase } from "../src/api/common";
import { WithAction } from "../src/api/state_decorators/with";
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
            static async setValueC(a: ActionC, s: AsyncContext<State>): Promise<ComponentStateDiff<State>> {
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
});
