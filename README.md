# ngSetState

## About

A library that helps developing angular components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Tutorial](https://itnext.io/angular-components-state-tracking-with-ng-set-state-e2b988540407?source=friends_link&sk=9a3596275dc73f72882fe2ec519b4528)
* [Angular Components with Extracted Immutable State](https://medium.com/@0x1000000/angular-components-with-extracted-immutable-state-86ae1a4c9237?source=friends_link&sk=3d9422a57d8ac49a4b1c8de39d6fc0b3) - an article on Medium that explains the ideas of this library.
* [Demo Site (stackblitz.com)](https://stackblitz.com/edit/set-state-greet)
* Demo Application - you can find a realistic usage of the library in this ASP.Net demo application - [SqGoods](https://github.com/0x1000000/SqGoods)

## Table of Contents

1. [Get Started](#get_satrted)
2. [Glossary](#glossary)
3. [API](#api)
   - [Mapped Types](#api)
   - [Initialization](#initialization)
   - [Decorators](#decorators)
      - [@With](#with)
      - [@WithAsync](#with_async)
      - [@WithAction](#with_action)
      - [@WithActionAsync](#with_action_async)
      - [@WithSharedAsSource](#with_shared_as_source)
      - [@WithSharedAsTarget](#with_shared_as_target)
      - [@AsyncInit](#async_init)
      - [@Emitter](#emitter)
      - [@BindToShared](#bind_to_shared)
      - [@IncludeInState](#include_in_state)
3. [Examples](#examples)
   - [Shared Component](#examples)
   - [Async](#async)
   - [Actions](#actions)
   - [Using in React](#using-in-react)

<a name="get_satrted"/>

## 1. Get Started

**Step 1:** Install ng-set-state

```sh
npm install ng-set-state
```

**Step 2:** Create a component with state tracking:

```ts
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
console.log(component.resultString);
//Result: 3

component.arg2 = 2;
console.log(component.resultString);
//Result: 5
```

All the class properties form a dependency graph:
* **sum** depends on **arg1** and **arg2**
* **resultString** depends on **sum**

Once any argument has been changed, all dependencies are recalculated (immediately or through *setTimeout*)

<a name="glossary"/>

## 2. Glossary

* **Component** - class for which state tracking is initialized.
* **State** - snapshot of component property values.
* **State Difference** - subset of state.
* **Modifier** - pure function that receives a state and returns a state difference which will patch the component property values. Modifiers are called when the component property values have changed and the current state is not equal to the previous one.
* **Action** - entity that causes modifier firing without changing the component property values. The entity instance is passed into the triggered modifiers.

<a name="api"/>

## 3. API
* ### Mapped types
  * **ComponentState&lt;T&gt;** - removes all methods, private properties. Converts observables into plain properties. All members are compulsory and readonly.
  * **ComponentStateDiff&lt;T&gt;** - removes all methods, private properties, observables. Converts subjects and event emitters into plain properties. All members are optional and readonly.
    ```ts
    class Component {
        member1: number;
        member2: Observable<string>;
        member3: Subject<number>;
        private member4: number;
        method1(){}
    }

    type State = ComponentState<Component>;
    //Equals to
    type State = {
      readonly member1: number;
      readonly member2: string | undefined;
      readonly member3: number | undefined;
    }

    type StateDiff = ComponentStateDiff<Component>;
    //Equals to
    type StateDiff = {
      member1?: number;
      member3?: number;
    }
    ```
  * **StateDiff&lt;T&gt;** - **ComponentStateDiff&lt;T&gt;** or array of actions where the first element can be **ComponentStateDiff&lt;T&gt;**

<a name="initialization" />

* ### Initialization
  In order to make modifiers and actions working within a class this class should be initialized  to keep track of its state. It can be done by calling **initializeImmediateStateTracking** or **initializeStateTracking** functions e.g.
  
  ```ts
  class Component {
    constructor() {
        initializeStateTracking(this,{/*options*/});
    }
  }
  ```
  where **options** are:
  ```ts
  export type InitStateTrackingOptions<TComponent> = {
    immediateEvaluation?: boolean | null,
    includeAllPredefinedFields?: boolean | null,
    initialState?: ComponentStateDiff<TComponent> | null,
    sharedStateTracker?: Object | Object[] | null,
    onStateApplied?: ((state: ComponentState<TComponent>, previousState: ComponentState<TComponent>) => void) | null,
    errorHandler?: ((e: Error) => boolean) | null
  }
  ```
  * **immediateEvaluation** - indicates if modifiers will be called immediately or trough *setTimeout* (avoids redundant calls). Default value is **false** for **initializeStateTracking** and **true** for **initializeImmediateStateTracking**.
  * **includeAllPredefinedFields** - by default only properties bound to modifiers are included in component property value snapshots (states). This options allows including all properties that had some explicit values (even **null** or **undefined**) at the moment of the initialization. This might be useful to provide some context for modifiers. Default value is **false** for **initializeStateTracking** and **true** for **initializeImmediateStateTracking**
  * **initialState** - initial snapshot of component property values that will be applied at the initialization.
  * **sharedStateTracker** - reference to other components with initialized state tracking. changes and actions at that components can be reflected in the initializing component. component can also cause state modification and action firing in the shared components.

  * **onStateApplied** - callback function which is called right after a new state has been applied.

  * **errorHandler** - callback function which is called when some error has been thrown in modifiers or action handlers

  **initializeStateTracking** and **initializeImmediateStateTracking** functions returns a reference to so-called **stateHandler**:

  ```ts
  class Component {

    stateHandler: IStateHandler<Component>

    constructor() {
       this.stateHandler = initializeStateTracking(this,{/*options*/});
    }
  }
  ```

  this is an object that provides API to manipulate the state tracking:
  ```ts
  export interface IStateHandler<TComponent> {
    getState(): ComponentState<TComponent>;
    modifyStateDiff(diff: StateDiff<TComponent>);
    subscribeSharedStateChange(): ISharedStateChangeSubscription | null;
    whenAll(): Promise<any>;
    execAction<TAction extends StateActionBase>(action: TAction|TAction[]): boolean;
    release();
  }
  ```
  * **getState()** returns a current snapshot of component property values (included into the state tracking)
  * **modifyStateDiff(diff: StateDiff<TComponent>);** - patches the current state and fires corresponding modifiers.
  * **subscribeSharedStateChange()** - if the component is connected with some shared components then calling this function will subscribe the current component on changes and actions in the shared ones.
  * **whenAll()** - returns a promise which is complete when all asynchronous modifiers are completed.
  * **execAction(...)** - fires execution of the passed actions
  * **release()** - unsubscribes from all shared components and Observables
  
<a name="decorators" />

* ### Decorators

<a name="with"/>

  * **@With** - decorator that marks a static(!) class method to be called when any of the specified properties have been just changed. The method should return some new values that will be patched to the component properties and a new state will be formed. It also can return new actions to be executed.

    ```ts
    //Short syntax
    @With('arg1', 'arg2')
    static calc(state: ComponentState<Component>): StateDiff<Component> {
      return {
        sum: state.arg1 + state.arg2
      };
    }

    //Full syntax
    @With<Component>('arg1', 'arg2')
        .Debounce(10/*ms*/)//This modifier is called when the specified properties are stable for 10ms
        .CallOnInit()//Forcibly call right after the initialization
        .If(s => s.arg1 > 0)//Call only is the condition is true
        .IfNotEqualNull()//Call only all the specified properties are not equal null
    static calcSum(
        state: ComponentState<Component>,//Current state
        previousState: ComponentState<Component>,//Previous state
        diff: ComponentStateDiff<Component>//Diff between current and previous
        ): StateDiff<Component> {
            
        return [{
            sum: state.arg1 + state.arg2
        }, new Action1(), new Action2()];
    }
    ```

<a name="with_async"/>

  * **@WithAsync** - decorator that marks a static(!) class method to be called when any of the specified properties have been just changed. The method should return a promise with some new values that will be patched (when the promise is complete) to the component properties and a new state will be formed.
    ```ts
    //Short syntax
    @WithAsync<Component>('arg1', 'arg2')
    static async calcAsync(getState: AsyncContext<Component>): Promise<StateDiff<Component>> {
      const initialState = getState();

      await initialState.service.doSomethingAsync();

      const state = getState();

      return {
        sum: state.arg1 + state.arg2
      };
    }

    //Full syntax
      @WithAsync<Component>('arg1', 'arg2')
        .Debounce(10/*ms*/)//Modifier is called when the specified properties are stable for 10ms
        .Locks('res1', 'res2')//Modifier will not be called while one the resources are locked by other modifiers
        .If(s=>s.arg1 > 2)//Modifier is called is the condition is true
        .PreSet(s => ({loading: true}))//Updates state right before calling the modifier
        .OnConcurrentLaunchReplace()//Behavior on collision
        //or .OnConcurrentLaunchPutAfter()
        //or .OnConcurrentLaunchCancel()
        //or .OnConcurrentLaunchConcurrent()
        //or .OnConcurrentLaunchThrowError()
        .OnErrorCall(s => ({isError: true}))//Behavior on error
        //or .OnErrorForget()
        //or .OnErrorThrow()
        .Finally(s => ({loading: true}))//Updates state right after calling the modifier

    static async calcAsync(
        getState: AsyncContext<Component>,//Functions that returns the current state
        previousState: ComponentState<Component>,//Previous state
        diff: ComponentStateDiff<Component>//Diff between current and previous 
        ): Promise<StateDiff<Component>> {
        const initialState = getState();

        await initialState.service.doSomethingAsync();

        //Modifier could be canceled due to a collision
        if(getState.isCancelled()) {
            return null;
        }

        const state = getState();

        return [{
            sum: state.arg1 + state.arg2
        }, new Action1(), new Action2()];
    } 
    ```
    
    * Behaviors on collision:
      * **OnConcurrentLaunchReplace** - latest fired modifier will be used
      * **OnConcurrentLaunchPutAfter()** - latest planned modifier will be triggered when the running one is completed
      * **OnConcurrentLaunchCancel()** - latest planned modifier will be discarded if the current one is not yet completed
      * **OnConcurrentLaunchConcurrent()** - all fired modifiers will work simultaneously
      * **OnConcurrentLaunchThrowError** - if modifier is triggered if the current one is not yet completed then an error will be thrown


<a name="with_action"/>

  * **@WithAction** - decorator that marks a static(!) class method to be called when a specified action is asked to be executed. The method should return some new values that will be patched to the component properties and a new state will be formed. It also can return new actions to be executed.
    ```ts
    class ActionIncreaseArg1By extends StateActionBase {
        constructor(readonly value: number) {
            super();
        }
    }
    ```
    ```ts
    @WithAction(ActionIncreaseArg1By)
    static onAction(
        action: ActionIncreaseArg1By,
        state: ComponentState<Component>): StateDiff<Component> {

        return {
            arg1: state.arg1 + action.value
        };
    }
    ```

<a name="with_action_async"/>

  * **@WithActionAsync** - similar to **@WithAsync**
      ```ts
      @WithActionAsync(ActionIncreaseArg1By)
      static async onAction(
          action: ActionIncreaseArg1By,
          getState: AsyncContext<Component>): Promise<StateDiff<Component>> {

          await getState().service.doSomething();

          const state = getState();

          return {
              arg1: state.arg1 + action.value
          };
      }
      ```

<a name="with_shared_as_source"/>

* **@WithSharedAsSource** - decorator that marks a static(!) class method to be called when a specified properties have just changed in the specified shared component. The method should return some new values that will be patched to the component properties and a new state will be formed. It also can return new actions to be executed.
    ```ts
    @WithSharedAsSource(SharedComponent, 'value').CallOnInit()
    static onValueChange(arg: WithSharedAsSourceArg<Component, SharedComponent>)        :StateDiff<Component> {
        return {
            message: `Shared value is ${arg.currentSharedState.value}`
        };

        //or
        //return [{
        //    message: `Shared value is ${arg.currentSharedState.value}`
        //}, new Action1(),new Action2(),...];
    }
    ```

<a name="with_shared_as_target"/>

  * **@WithSharedAsTarget** - decorator that marks a static(!) class method to be called when a specified properties have just changed in the specified shared component. The method should return some new values that will be patched to the component properties and a new state will be formed. It also can return new actions to be executed.
    ```ts
    @WithSharedAsTarget(SharedComponent, 'componentValue')
    static onCmpValueChange(arg: WithSharedAsTargetArg<Component, SharedComponent>): StateDiff<SharedComponent> {
        return {
            value: arg.currentState.componentValue * 10
        };
        //or
        //return [{
        //    value: arg.currentState.componentValue * 10
        //}, new Action1(),new Action2(),...];
    }
    ```

<a name="async_init"/>

  * **@AsyncInit** - decorator that marks a static(!) class method to be called right after the initialization. The method should return a promise with some new values that will be patched (when the promise is complete) to the component properties and a new state will be formed.
    ```ts
    @AsyncInit()
      //.Locks('res1', 'res2') - similar to @WithAsync
    static async init(getState: AsyncContext<Component>): Promise<StateDiff<Component>> {

        const state = getState();

        const greetingFormat = await state.services.getGreetingFormat();

        return { greetingFormat };

        //or
        //return [{ greetingFormat }, new Action1(), new Action2()];
    }
    ```

<a name="emitter"/>

  * **@Emitter()** - decorator for a class property. If this decorator is specified for some class property that means that all side effects will happen (@With, @WithAsync, @Out) even if a new value equals to the previous one during analyzing a new state difference.

<a name="bind_to_shared" />

  * **@BindToShared([SharedClass], [sharedPropName],[index])** - It marks a component field to be a proxy to a shared tracker filed.
    * SharedClass - specifies a shared component type
    * propName - specifies a shared property name in case if the name differs.
    * index - if a component is bound to several shared trackers then this option will help to solve a possible naming conflict.
    
    ```ts
    @BindToShared(SharedComponent, 'value')
    sharedValue: number;
    ```
<a name="include_in_state">

* **@IncludeInState()** - It marks a component field to be always included into snapshots.

<a name="examples"/>

## 4. Examples
### Shared Components
```ts
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
const component = new Component(sharedComponents);

console.log(component.message);
//Shared value is 0

sharedComponent.value = 7;
console.log(component.message);
//Shared value is 7

component.componentValue = 10;
console.log(component.message);
//Shared value is 100

component.sharedValue = 10;
console.log(component.message);
//Shared value is 10

component.onDestroy();
```

<a name="async"/>

### Async
```ts
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

console.log(component.greeting);
//Hi, Joe!
```
<a name="actions"/>

### Actions
```ts
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
    log: (m) => console.log(m)
};

const sharedComponent = new SharedComponent(logger);

const component = new Component(logger, sharedComponent);

component.arg = "arg1";
//Action B with arg "arg1"
//Action S with arg "arg1"
//Action B with arg "arg1 from Shared"

component.stateHandler.execAction(new ActionS('arg2'));
//Action S with arg "arg2"
//Action B with arg "arg2 from Shared"

sharedComponent.stateHandler.execAction(new ActionA('arg3'));
//Action A with arg "arg3"
//Action B with arg "arg3"
```
<a name="using-in-react"/>

### Using in React
```ts
import React, { ChangeEventHandler } from 'react';
import './App.css';
import { ComponentState, With, IStateHandler, StateDiff, initializeImmediateStateTracking } from 'ng-set-state';

type State = ComponentState<ComponentStateTrack>;
type NewState = StateDiff<ComponentStateTrack>;

class ComponentStateTrack {
    arg1Text = '';
    arg1Status = 'Empty';
    arg2Text = '';
    arg2Status = 'Empty';
    sumText = 'No proper args'

    arg1: number|null = null;
    arg2: number|null = null;

    stateHandler: IStateHandler<ComponentStateTrack>;

    constructor(stateSetter: (s: State) => void) {
      this.stateHandler = initializeImmediateStateTracking<ComponentStateTrack>(this,
        {
            onStateApplied: (s) => stateSetter(s)
        });
    }

    @With('arg1Text')
    static parseArg1(state: State): NewState {

        if (!state.arg1Text) {
            return {
                arg1: null,
                arg1Status: "Empty"
            }
        }

        const arg1 = parseInt(state.arg1Text);
        if(isNaN(arg1)) {
            return {
                arg1: null,
                arg1Status: "Invalid"
            };
        } else {
            return {
                arg1,
                arg1Status: "Ok"
            };
        }
    }

    @With('arg2Text')
    static parseArg2(state: State): NewState {
        if (!state.arg2Text) {
            return {
                arg1: null,
                arg1Status: "Empty"
            }
        }

        const arg2 = parseInt(state.arg2Text);
        if(isNaN(arg2)) {
            return {
                arg2: null,
                arg2Status: "Invalid"
            };
        } else {
            return {
                arg2,
                arg2Status: "Ok"
            };
        }
    }

    @With('arg1', 'arg2')
    static setCalcStatus(state: State): NewState {
        if (state.arg1 == null || state.arg2 == null) {
            return {
                sumText: 'No proper args'
            };
        } else {
            return {
                sumText: 'Calculating...'
            }
        }
    }

    @With('arg1', 'arg2').Debounce(2000/*ms*/)
    static setCalcResult(state: State): NewState {
        if (state.arg1 != null && state.arg2 != null) {
            return {
                sumText: (state.arg1 + state.arg2).toString()
            };
        }
        return null;
    }
}

export class App extends React.Component<any, State> {

  readonly stateTrack: ComponentStateTrack;

  constructor(props: any) {        
      super(props);
      this.stateTrack = new ComponentStateTrack(s => this.setState(s));
      this.state = this.stateTrack.stateHandler.getState();
  }

  arg1Change: ChangeEventHandler<HTMLInputElement> = (ev) => {
      this.stateTrack.arg1Text = ev.target.value;
  };

  arg2Change: ChangeEventHandler<HTMLInputElement> = (ev) => {
      this.stateTrack.arg2Text = ev.target.value;
  };

  render = () => {
      return (
          <div>
            <div>
              Arg 1: <input onChange={this.arg1Change} /> {this.state.arg1Status}
            </div>
            <div>
              Arg 2: <input onChange={this.arg2Change}/> {this.state.arg2Status}
            </div>
            <div>
              Result: { this.state.sumText }
             </div>
          </div>
        );
  }
}
```