# ngSetState

## About

Library that helps developing angular components in a more functional style where UI logic is representing as a series of morphisms of immutable states.

## Get Started

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

**Step 3:** Define “transformation” functions which will be called when any of specified parameters (in “With” decorator) have just changed. The functions should return a difference object which will used to create a new component state.

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

It is possible to call **modify** method directly from template – Angular AoT will check that such calls are correct.

**Step 7:** Now the component can be used as follows:
```html
<some-component [(property1)]="…"  (property2Change)="…$event…"></some-component>
```
## Explanation
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
