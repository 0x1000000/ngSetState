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

