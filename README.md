# ngSetState

## About

A library that helps developing angular components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Tutorial](https://itnext.io/angular-components-state-tracking-with-ng-set-state-e2b988540407?source=friends_link&sk=9a3596275dc73f72882fe2ec519b4528)
* [Angular Components with Extracted Immutable State](https://medium.com/@0x1000000/angular-components-with-extracted-immutable-state-86ae1a4c9237?source=friends_link&sk=3d9422a57d8ac49a4b1c8de39d6fc0b3) - an article on Medium that explains the ideas of this library.
* [Demo Site (stackblitz.com)](https://stackblitz.com/edit/set-state-greet)
* Demo Application - you can find a realistic usage of the library in this ASP.Net demo application - [SqGoods](https://github.com/0x1000000/SqGoods)

## Table of Contents

1. [Get Started](#get_satrted)
2. [Advantages of using the library](#advantages)
3. [API](#api)
<a name="get_satrted"/>

## 1. Get Started

**Step 1:** Install ng-set-state

```sh
npm install ng-set-state
```

**Step 2:** Create a simple greeting component:

```html
<div>  
  <h1>Greeting Form</h1>
  <div>
    <label for="ni">Name</label><br />
    <input [(ngModel)]="userName" id="ni" />
  </div>
  <h1>{{greeting}}</h1>
</div>
```
```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-greeting-form',
  templateUrl: './greeting-form.component.html'
})
export class GreetingFormComponent {
  userName: string = "";
  greeting:  string = "";
}
```

**Step 3:** Add **StateTracking** decorator:
```ts
import { Component } from '@angular/core';
import { StateTracking } from 'ng-set-state';

@Component({
  selector: 'app-greeting-form',
  templateUrl: './greeting-form.component.html'
})
@StateTracking()
export class GreetingFormComponent {
  userName: string = "";
  greeting:  string = "";
}
```

**Step 4:** Add a state transition function which will generate greetings:
```ts
import { Component } from '@angular/core';
import { StateTracking, With, ComponentState, ComponentStateDiff } from 'ng-set-state';

@Component({
  selector: 'app-greeting-form',
  templateUrl: './greeting-form.component.html'
})
@StateTracking()
export class GreetingFormComponent {
  userName: string = "";
  greeting:  string = "";

  @With("userName")
  static genGreeting(currentState: State): NewState
  {
      return {
        greeting: `Hello ${currentState.userName}!`
      };
  }
}

type State = ComponentState<GreetingFormComponent>;
type NewState = ComponentStateDiff<GreetingFormComponent>;
```
**Step 5:** Make it asynchronous
```ts
@With("userName").Debounce(1000/*ms*/)
```

---
**[The greeting application code on stackblitz.com...](https://stackblitz.com/edit/set-state-greet)**

---

<a name="advantages"/>

## 2. Advantages of using the library

1. __Performance__ – the angular change detection will check only already evaluated properties 
2. __Independence__ – the library does not actually depend on angular, so if you decided to move to another framework (e.g. Vue) you will be able to reuse your state logic
3. __Quality of reusable components__ – Angular allows having several input parameters which can be changed independently and maintaining all possible combinations is usually not very simple (ngOnInit, ngOnChange, property setters), so often developers take into consideration just common scenarios, which is not great when you develop reusable components. The library naturally simplifies handling different combinations of input parameters, since it implicitly creates a dependency graph over all state properties.

<a name="api"/>

## 3. API
* ### Decorators
  * **@StateTracking&lt;TComponent&gt;**(options)
  ```ts
    {
        immediateEvaluation?: boolean,
        includeAllPredefinedFields?: boolean,
        onStateApplied?: (component, state, previousState) => void,
        getInitialState?: (component) => Object,
        setHandler?: (component, handler: IStateHandler<>) => void,
        getSharedStateTracker?: (component) => Object | Object[],
    }
  ```
     * Optional parameters:
       * **immediateEvaluation** (default **false**) - if **true** then all transition will be called immediately;
       * **includeAllPredefinedFields** (default **false**) - if **true** then all fields with some initial value (including **null**) will be presented in state objects;
       * **onStateApplied** - callback function which will be called when a new 
       consistent state is evaluated and applied to the component;
       * **setHandler** - callback function which will be called right after the component is created and a handler object will be passed as an argument
       ```ts
       export interface IStateHandler<TComponent> {
         getState(): ComponentState<TComponent>;

         modifyStateDiff(diff: ComponentStateDiff<TComponent>);

         subscribeSharedStateChange(): ISharedStateChangeSubscription | null;

         whenAll(): Promise<any>;

         release();
       }
       ```
        * **getState** - returns a current immutable (freezed) state object;
        * **modifyStateDiff** - initializes a state change cycle;
        * **subscribeSharedStateChange** makes the component react on a shared state changes
        * **whenAll** - returns a promise which will be resolved when all asynchronous operations are complete;
        * **release** - cancels all asynchronous operations and unsubscribes from shared states changes
  * Alternatively to **@StateTracking** you can call the following function in the component constructor:
  ```ts
  constructor(){
    const handler = initializeStateTracking<T>(this, {..options..});
  }  
  ```
  * Optional options:  
  ```ts
  {
    immediateEvaluation?: boolean | null,
    includeAllPredefinedFields?: boolean | null,
    onStateApplied?: ((state, previousState) => void) | null,
    initialState?: ComponentStateDiff<TComponent> | null,
    sharedStateTracker?: Object | Object[] | null,
  }
  ```
  * **@BindToShared([propName],[index])** - It marks a component field to be a proxy to a shared tracker filed. 
    * **propName** - specifies a shared property name in case if the name differs.
    * **index** - if a component is bound to several shared trackers then this option will help to solve a possible naming conflict.

  * **@With&lt;TState&gt;(...propNames: (keyof TState)[])** - It marks a function that returns a new state difference when at least one value of passed members has changed (a state with modified properties will be passed as a parameter). The state difference will be applied to a current state and the library will check all functions, marked with the decorator, one more. The process will continue until a component state becomes stable or a limit of cycles (default value equals 1000) is reached. Example:
  ```ts
    @With("someProperty1", "someProperty2",)
    public static calc3(currentState: SomeState): Partial<SomeState> | null {
        return {
            someProperty3: currentState.someProperty1 + currentState.someProperty2,
        }
    }    
  ```

  You can also get access to a previous state (2-nd argument) and changes between a current sate and the previous one (3-rd argument)
  ```ts
    @With("someProperty1", "someProperty2",)
    public static calc3(
        currentState: SomeState, 
        previousState: SomeState, 
        changes: Partial<SomeState>): Partial<SomeState> | null {

        return {
            someProperty3: currentState.someProperty1 + currentState.someProperty2,
        }
    }
  ```
   * **WithAsync&lt;TState&gt;(...propNames: (keyof TState)[])** - similar to __@Width(...)__ but this decorator marks an asynchronous function which returns a promise to state change. The function receives a function as a parameter (instead of an object) which returns a current state:
   ```ts
        @WithAsync("data")
        public static async init(getState: ()=> State): Promise<Partial<State|null>>{
            const initialState: State = getState();
            await initialState.api.save(initialState.data);
            return null;
        }
    ```
    
    the decorator has the following modifiers:
    * OnConcurrentLaunchCancel()
    * OnConcurrentLaunchPutAfter()
    * OnConcurrentLaunchReplace()
    * OnConcurrentLaunchConcurrent()
    * OnErrorThrow()
    * OnErrorForget()
    * OnErrorCall(method: (currentState: TState, error: any) => Partial<TState> | null)
    * Locks(...lockIds: string[])
    * Debounce(..ms..:number)

  You can also get access to a previous state (2-nd argument) and changes between a current sate and the previous one (3-rd argument) like in __@With__ decorator.

  The first function also implements __AsyncContext__ interface, so you can check if an asynchronous "transition" function is cancelled:
  
  ```ts
   @WithAsync("editingData").OnConcurrentLaunchReplace()
   public static async validate(getState: AsyncContext): Promise<Partial<State|null>>{
         const initialState: State = getState();
         const correct = await initialState
             .api.validate(initialState.editingData);

         if(getState.isCancelled()) {
             //editingData has changed during api.validate
             //no need to continue
             return null;
         }

         const correct2 = await initialState
             .api2.validate(initialState.editingData);

         return { valid: correct1 && correct2 };
     }
  ```
  * **Emitter()**: decorator for state fields. If this decorator is specified for some state filed that means that all side effects will happen (@With, @WithAsync, @Out) even if a new value equals to the previous one during analyzing a new state difference. The decorator can be used to create a "trigger" which will be used to perform some action:
  ```ts
  class SomeState{
      ... 
      @Emitter()
      public readonly someAction: string;
      ...

      @With("someAction")
      public static doSomeAction(currentState: SomeState): Partial<SomeState> {
          ...
      }
  } 
  ```
    Also it can be can be used together with **@Out()** decorator to emit the same value from your component:
  ```ts
  class SomeState{
      ... 
      @Out()
      @Emitter()
      public readonly outProperty: string;
      ...
  } 
  ```
   * **Calc&lt;TState, Prop extends keyof TState&gt;((propNames: (keyof TState)[], func: (currentSate: TState, previousSate: TState, diff: Partial<TState>) => TState[Prop]): any** - The decorator is supposed to be defined under some state property. It specifies a function which will be called when one of the specified properties (__propNames__ array) have been changed (a state instance with updated properties will be a first argument for the function). A result of the function will be 
   assigned to the property. 
   * **AsyncInit&lt;TState&gt;()** - marks an asynchronous methods which will be called when a component created:
   ```ts
        @AsyncInit().Locks("init")
        public static async init(getState: ()=> State): Promise<Partial<State|null>>{
            const initialState: State = getState();
            const data = await initialState.api.getData();
            return {data: data};
        }
    ```   

  * **In&lt;TState&gt;(componentProp?: string)** - creates a mapping between some state property and some component input parameter. Changing the input parameter will lead to state modification. Example:
  ```ts
  class SomeState{
      ... 
      @In()
      public readonly someProperty: string;
      ...
  } 
  ```
  the code is equivalent to:
  ```ts
  class SomeComponent{
      ... 
      @Input()
      public set someProperty(value: string){
          this.modifyState("someProperty", value);
      }
      ...
  } 
  ``` 
  * **Out&lt;TState&gt;(componentProp?: string)** -creates a mapping between some state parameter and some component output editor. Example:
  ```ts
  class SomeState{
      ... 
      @Out()
      public readonly someProperty: string;
      ...
  } 
  ```
  the code is equivalent to:
  ```ts
  class SomeComponent{
      ... 
      @Output()
      public readonly somePropertyChange = new EventEmitter<string>();
      ...
      public onAfterStateApplied(previousState: CalculatorState): void {
          if (this.state.someProperty !== previousState.someProperty) {
              this.somePropertyChange.emit(this.state.someProperty);
          }
      }
    ...
  } 
  ```
* Classes

    * ### WithStateBase&lt;TState&gt; implements IWithState&lt;TState&gt;
        * **state: TState** - gets access to a current component state (can be used in markup);
        * **modifyState(propName: keyof TState, value: any): boolean** - sets a new component state with a new state member value. Other state member will be also changed if they depend on the modified member (see, “With” decorator). If no changes have been detected it will return **false** otherwise **true**.
        * **modifyStateDiff(diff: Partial&lt;TState&gt;|null): boolean** - sets a new component state with new state member values. Other state member will be also changed if they depend on the modified members (see, “With” directive). If no changes have been detected it will return **false** otherwise **true**.
        * **onAfterStateApplied?()** - If this method is implemented, it will be called when the component has just moved to a new state. The method can be used to imitate an asynchronous operation (see “Asynchronous operations” (todo)).
        * **whenAll(): Promise<any>** - Returns a promise which will be resolved when all asynchronous operations finish
