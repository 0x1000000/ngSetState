# ngSetState

## About

A library that helps developing angular components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Angular Components with Extracted Immutable State](https://medium.com/@0x1000000/angular-components-with-extracted-immutable-state-86ae1a4c9237?source=friends_link&sk=3d9422a57d8ac49a4b1c8de39d6fc0b3) - an article on Medium that explains the ideas of this library.
* [Demo Site](https://0x1000000.github.io/ngSetState/)
* [Demo Code](https://github.com/0x1000000/ngSetState/tree/master/demo/src/app)

## Table of Contents

1. [Get Started](#get_satrted)
  
    1.1 [Get Started with asynchronous transitions](#get_satrted_async)
2. [Advantages of using the library](#advantages)
3. [API](#api)
<a name="get_satrted"/>

## 1. Get Started

**Step 1:** Install ng-set-state

```sh
npm install ng-set-state --save
```

**Step 2:** Create an entity that will represent a component state

```ts
export class State {
    public readonly property1 = "initial value";

    public readonly property2 = "initial value";

    public readonly property3 = "initial value";
}
```

**Step 3:** Define “transition” functions which will be called when any of the specified parameters (in “With” decorator) have just changed. The functions should return a difference object (Partial&lt;TState&gt;) which will be used to create a new component state.

```ts
import { With } from "ng-set-state";

export class State {
    public readonly property1: string = "initial value";

    public readonly property2: string = "initial value";

    public readonly property3: string = "initial value";

    @With("property1")
    public static calcProperty2(previousState: State): Partial<State> | null {
        return {
            property2: "f(previousState)"
        };
    }

    @With("property1", "property2")
    public static calcProperty3(previousState: State): Partial<State> | null {
        return {
            property3: "f(previousState)"
        };
    }
}
```
_Note: all property names specified inside __@With__ decorator are validated by TypeScript. If you specify a name of a not existing property you will get a compilation error._

Optionally, you can mark the “transition” function with __Debounce(..ms..)__ options - it delays calling “transition” function if dependencies keep changing:

```ts
@With("property1").Debounce(1000)
public static calcProperty3(previousState: State): Partial<State>|null{
    ...
}
```

**Step 3 (alternative):** a “transformation” function can defined using __@Calc__ decorator under a state property. That approach is applicable when you need to update just a single property (unlike __@With__ decorator that allows changing several properties simultaneously) which depends on other state properties:

```ts
import { Calc } from "ng-set-state";

export class State {
    public readonly property1: string = "initial value";

    @Calc(["property1"], (state: State) => "f(previousState)")
    public readonly property2: string = "initial value";

    @Calc(["property1", "property2"], (state: State) => "f(previousState)")
    public readonly property3: string = "initial value";
}
```
**Step 4:** Specify which state properties will be mapped to component inputs and which properties will be mapped to component outputs using In, Out decorators

```ts
import { In, Out, With } from "ng-set-state";

export class State {
    @In()
    @Out()
    public readonly property1: string = "initial value";

    public readonly property2: string = "initial value";

    @Out()
    public readonly property3: string = "initial value";
	
    @With("property1")
    public static calcProperty2(previousState: State): Partial<State> | null {
        return {
            property2: "f(previousState)"
        };
    }

    @With("property1", "property2")
    public static calcProperty3(previousState: State): Partial<State> | null {
        return {
            property3: "f(previousState)"
        };
    }
```

**Step 5:** Create component input/output declarations. This is required for Angular AoT compilation which does not allow dynamic declarations.

```ts
export class State {
    public static readonly inputs = ["property1"];

    public static readonly outputs = ["property2Change", "property3Change"];
	
	...
```

**Step 5:** Attach the state to some component

```ts
import { Component } from "@angular/core";
import { WithStateBase } from "ng-set-state";

@Component({
    selector: "some-component",
    template: "./some.component.html",
    inputs: State.inputs,
    outputs: State.outputs
})
export class SomeComponent extends WithStateBase<State> {
    constructor() {
        super(new State(), State.inputs, State.outputs);
    }
}
```

**Step 5 (alternative):** If you do not want using inheritance there is an alternative way to attach state through a decorator

```ts
@Component({
    selector: "some-component",
    template: "./some.component.html",
    inputs: State.inputs,
    outputs: State.outputs
})
@WithState(State, State.inputs, State.outputs)
export class SomeComponent implements IWithState<State> {
    public state: State;

    public ngOnChanges(changes: SimpleChanges) {};

    public modifyState<TK extends keyof State>(propName: TK, value: State[TK]): void {}

    public modifyStateDiff(diff: Partial<TState>|null): void {}

    public onAfterStateApplied?(): void {}
}
```

**Step 6:** Add state modifiers inside event handlers.

```ts
import { Component } from "@angular/core";
import { WithStateBase } from "ng-set-state";


@Component({
    selector: "some-component",
    template: "./some.component.html",
    inputs: State.inputs,
    outputs: State.outputs
})
export class SomeComponent extends WithStateBase<State> {
    constructor() {
        super(new State(), State.inputs, State.outputs);
    }

    public onEvent1(value: string): void {
        this.modifyState("property1", value);
    }

    public onEvent2(value: string): void {
        this.modifyState("property2", value);
    }

    public onEvent3(value: string): void {
        this.modifyState("property3", value);
    }
}
```

_Note: It is possible to call **modify** method directly from template – Angular AoT will check that such calls are correct._

**Step 7:** Add state modifiers for actions that do relate to value changes (e.g. a button click )
```ts
export class SomeComponent extends WithStateBase<State> {
    ...
    public onChangeValuesClick(value: string): void {
        this.modifyStateDiff(this.state.withChangedValues());
    }
}
```
```ts
export class State {
    ...
    public withChangedValues(): Partial<State> | null {
        if(this.property1 === "magic value"){
            return {
                property2: "new value", 
                property3: "new value"
            };
        }
        return null;
    }
}

```

**Step 8:** Now the component can be used as follows:
```html
<some-component [(property1)]="…"  (property2Change)="…$event…"></some-component>
```
<a name="get_satrted_async"/>

### 1.1 Get Started with asynchronous transitions

**Step 1:** Add asynchronous services into your state.
```ts
export class State {
    constructor(public readonly dataService: DataService){}

    public readonly data: string | null = null;
}
```
**Step 2:** (Optional) add asynchronous initialization method (marked with decorator @AsyncInit()):
```ts
import { AsyncInit } from 'ng-set-state';

export class State {
    constructor(public readonly dataService: DataService){}

    public readonly data: string | null = null;

    @AsyncInit()
    public static async init(getState: ()=> State): Promise<Partial<State|null>>{
        const initialState: State = getState();
        const data = await initialState.getData();
        return {data: data};
    }
}
```
The method receives a function which returns a current component sate. The method should return a promise with a state update (Partial of State) or null.

**Step 3:** Add asynchronous transition function (marked with decorator __@WithAsync(__*state fields*__)__) which will be called when some of specified fields have been changed:
```ts
import { AsyncInit, WithAsync } from 'ng-set-state';

export class State {
    constructor(public readonly dataService: DataService){}

    public readonly data: string | null = null;

    @AsyncInit()
    public static async init(getState: ()=> State): Promise<Partial<State|null>>{
        const initialState: State = getState();
        const data = await initialState.getData();
        return {data: data};
    }

    @WithAsync("data")
    public static async init(getState: ()=> State): Promise<Partial<State|null>>{
        const initialState: State = getState();
        await initialState.save(initialState.data);
        return null;
    }
}
```
Optionally, you can specify a behavior in a situation when the same transition function is concurrently called:
```ts
    @WithAsync("data").OnConcurrentLaunchPutAfter()//Default

    @WithAsync("data").OnConcurrentLaunchReplace()

    @WithAsync("data").OnConcurrentLaunchPutAfter()

    @WithAsync("data").OnConcurrentLaunchCancel()
```
Also you can specify a behavior in a situation when transition function throws an unhandled error:
```ts
    @WithAsync("data").OnErrorCall((getCurrentState:()=>State)=>Partial<State>|null)

    @WithAsync("data").OnErrorForget()
    
    @WithAsync("data").OnErrorThrow()//Default
```

In addition, you can mark the “transition” function with __Debounce(..ms..)__ options - it delays calling “transition” function if dependencies keep changing:

```ts
@WithAsync("data").Debounce(1000)
```

In a case if some field triggers some async action you can use **If** and **Finally** decorator extensions to check preconditions and and set postconditions regardless results of the action:

```ts
@WithAsync("dataToSave").If(s=>s.dataToSave != null).Finally(()=>{dataToSave: null})
public static save(getCurrentState: ()=>TState): Promise<Partial<TState>>
```


**Step 4** (Optional) You can specify asynchronous locks ids:
```ts
import { AsyncInit, WithAsync } from 'ng-set-state';

export class State {
    constructor(public readonly dataService: DataService){}

    public readonly data: string | null = null;

    @AsyncInit().Locks("init")
    public static async init(getState: ()=> State): Promise<Partial<State|null>>{
        const initialState: State = getState();
        const data = await initialState.getData();
        return {data: data};
    }

    @WithAsync("data").Locks("init")
    public static async init(getState: ()=> State): Promise<Partial<State|null>>{
        const initialState: State = getState();
        await initialState.save(initialState.data);
        return null;
    }
}
```
Locks prevent concurrent launching

<a name="advantages"/>

## 2. Advantages of using the library

1. __Performance__ – the angular change detection will check only already evaluated properties 
2. __Independence__ – the library does not actually depend on angular, so if you decided to move to another framework (e.g. Vue) you will be able to reuse your state logic
3. __Quality of reusable components__ – Angular allows having several input parameters which can be changed independently and maintaining all possible combinations is usually not very simple (ngOnInit, ngOnChange, property setters), so often developers take into consideration just common scenarios, which is not great when you develop reusable components. The library naturally simplifies handling different combinations of input parameters, since it implicitly creates a dependency graph over all state properties.

<a name="api"/>

## 3. API
* Classes

    * ### WithStateBase&lt;TState&gt; implements IWithState&lt;TState&gt;
        * **state: TState** - gets access to a current component state (can be used in markup);
        * **modifyState(propName: keyof TState, value: any): boolean** - sets a new component state with a new state member value. Other state member will be also changed if they depend on the modified member (see, “With” decorator). If no changes have been detected it will return **false** otherwise **true**.
        * **modifyStateDiff(diff: Partial&lt;TState&gt;|null): boolean** - sets a new component state with new state member values. Other state member will be also changed if they depend on the modified members (see, “With” directive). If no changes have been detected it will return **false** otherwise **true**.
        * **onAfterStateApplied?()** - If this method is implemented, it will be called when the component has just moved to a new state. The method can be used to imitate an asynchronous operation (see “Asynchronous operations” (todo)).
        * **whenAll(): Promise<any>** - Returns a promise which will be resolved when all asynchronous operations finish
* ### Decorators
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
  * **With&lt;TState&gt;(...propNames: (keyof TState)[])** - It marks a function that returns a new state difference when at least one value of passed members has changed (a state with modified properties will be passed as a parameter). The state difference will be applied to a current state and the library will check all functions, marked with the decorator, one more. The process will continue until a component state becomes stable or a limit of cycles (default value equals 1000) is reached. Example:
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
