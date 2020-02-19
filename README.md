# ngSetState

## About

A library that helps developing angular components in a more functional style where UI logic is representing as a series of immutable state transitions.

* [Demo Site](https://0x1000000.github.io/ngSetState/)
* [Demo Code](https://github.com/0x1000000/ngSetState/tree/master/demo/src/app)

## Table of Contents

1. [Get Started](#get_satrted)
  
    1.1 [Get Started with asynchronous transitions](#get_satrted_async)
2. [Advantages of using the library](#advantages)
3. [API](#api)
4. [Explanation](#explanation)
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

<a name="explanation"/>

## 4. Explanation
The description of this library says it helps developing angular components in a more “functional” style so let’s figure out how exactly it helps. In short, the main principles of “functional” programming paradigm are: 
* avoiding changing state and mutable data
* “pure” functions (idempotent code parts with no side effects)
Can an angular component be represented as a “pure” function? Let’s see:
```
[Ip1,Ip2,...,Iu1,Iu2,...] => [<HTML>,O1,O2,...]
```
where 
* **Ip1** – Angular component input parameter
* **Iu1** – User input (e.g. a checkbox value)
* **&lt;HTML&gt;** - 
* **O1** - Angular component output parameter

However, in reality, inputs do not come simultaneously - they are distributed in time:
```
Time >--(Ip1)----(Iu1)-(Iu2)--(Ip2)-----(Ip1')---((Iu2'))....->
         ||       ||    ||     ||        ||       ||
         \/       \/    \/     \/        \/       \/
        [..]     [..]  [..]   [..]      [..]     [..]
```
So, there should be a persisting state that contains previous input values when a next input value has come:
```
[Ip2’]+([Ip1,Ip2,...,Iu1,Iu2,...]) => [<HTML>,O1,O2,...],([Ip1,Ip2’,...,Iu1,Iu2,...])
```
It shows that angular component cannot be truly stateless and in addition to that most components cannot be idempotent (provide the same result with the same inputs). Most of them will look like that:
```
[Ip1,Ip2,...,Iu1,Iu2,..., S(internal)] => [<HTML>,O1,O2,..., S(internal)']
```
where
* **S(internal)** – previous “internal” component state 
* **S(internal)’** – next “internal” component state
That means that component appearance and output parameters depend not only on input parameters and user input but also on some previous state. For example, spinbox - when you click “increase” button the result will depend on a previous value and not on input parameters:
```
[“initial value”(0),“on increase”, value(10)] => [<span>11</span>, value(11)']
```
So, angular components (in general) are not idempotent and they are not stateless. Nevertheless, functional style can still be used - the only thing we need to do is to minimize number of places where component state is modified. Ideally, there should be only one such place:
```ts
state: TState;

setState(newState: TState){
   this.state = newState;
   //output emitters
}
```
where
```
TState = [Ip1,Ip2,...,Iu1,Iu2,..., S(internal)] U [O1,O2,...]
```
In this case we can represent a component life cycle as:
```
Time >--(Ip1)----(Iu1)-(Iu2)--(Ip2)-----(Ip1')---(Iu2')....->
          f1       f2    f3     f4        f1       f2
          \/       \/    \/     \/        \/       \/
         [S1]     [S2]  [S3]   [S4]      [S5]     [S6]
```
where
* **S1, S2,…** - versions of component state 
* **f1, f2, …** - **function(“new input value”, ”Previous State”)=>”New State”**

In typescript it can be written as:
```ts
class State {

    public readonly Ip1: any;

    public readonly Ip2: any;

    public readonly Iu1: any;

    public readonly Iu2: any;

    public readonly Sinternal: any;

    public readonly O1: any;

    public readonly O2: any;

    constructor(previousState: State, changes: Partial<State>) {
        Object.assign(this, previousState, changes);
    }

    //f1
    public withIp1(newIp1): State {
        return new State(this, { Ip1: newIp1/*, O1: "some value"...*/ });
    }

    //f2
    public withIu1(newIu1): State {
        return new State(this, { Iu1: newIu1/*, O1: "some value"...*/ });
    }

    //...
}
```
The functions f1, f2… can be 100% pure so the most of component logic can be developed using “functional” style since all "impurity" is isolated in a single place (setState).

However, it is still not clear how to map state inputs and outputs to component ones. If you did it manually that mapping would look like that:
```ts
class SomeComponent implements OnChanges {

    @Input() public Ip1: any;
    @Input() public Ip2: any;

    @Output() public readonly O1Change = new EventEmitter<any>();

    @Output() public readonly O2Change = new EventEmitter<any>();

    public state = new State(null, null);

    public ngOnChanges(changes: SimpleChanges): void {

        if (changes.Ip1) {
            this.setState(this.state.withIp1(this.Ip1));
        }
        if (changes.Ip2) {
            this.setState(this.state.withIp2(this.Ip2));
        }

    }

    public setState(newState: State) {
        const o1Changed = this.state.O1 !== newState.O1;
        const o2Changed = this.state.O2 !== newState.O2;

        this.state = newState;

        if (o1Changed) {
            this.O1Change.emit(this.state.O1);
        }

        if (o2Changed) {
            this.O2Change.emit(this.state.O2);
        }
    }
}
```
The code does not look great - it is boilerplate and it is very easy to make a mistake. That is where the library becomes very useful – no need to implement **ngOnChanges** or even **setState** - the libabry will implement them automatically. The only thing you need is to specify which state members are input parameters and which ones are output (one parameter can be input and output simultaneously) and how they will be represented in component annotation (that step could be omit if AoT compilation allowed dynamic declarations):
```ts
class State {
    public static readonly inputs = ["Ip1", "Ip2"];
    
    public static readonly outputs = ["O1Change", "O2Change"];

    @In()
    public readonly Ip1: any;

    @In()
    public readonly Ip2: any;

    public readonly Iu1: any;

    public readonly Iu2: any;

    public readonly Sinternal: any;

    @Out()
    public readonly O1: any;

    @Out()
    public readonly O2: any;
    
    ...
```

The statement
```ts
this.setState(this.state.with...(...));
```
is not very convenient neither and it is replaced with method
```ts
this.modify(“state prop”, newValue);
```
which can be called form event handlers to move a component to a next state.

Methods “withProp(propValue)” also have a boilerplate logic: they need to compare a new value with old one to check if a modification is really happened and then modify a current state. This logic is automated in the library by using @With decorator on static methods:
```ts
@With("Ip1", "Iu2")
public static f1(currentState: State): Partial<State> | null {
    return { O1: "f(currentState.Ip1, currentState.Ip2)" };
}
```
If state properties Ip1 or Iu2 are somehow modified their values will be applied to a current state and the method **f1** will be called. The method can leave the existing state as it is (by returning null) or modify other state properties by returning a state delta which will be applied to the current state.
