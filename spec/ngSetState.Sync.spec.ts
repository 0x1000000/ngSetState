import { With, WithStateBase, Calc, ComponentState, StateDiff, StateTracking, IncludeInState } from "../src/index";
import { } from "jasmine";
import { EventEmitter } from "./helpers";

describe('Synchronous tests', () => {
    it('Component properties should be initialized and result should reflect arguments', () => {

        const component = new TestComponent();

        //arg1 to 7
        component.modifyState('arg1', 7);
    

        //arg2 to 8
        component.onValue2(8);

        //Assert result
        expect(component.state.result).toBe(15);

        //arg2 to 10
        component.onValue2(10);

        //Assert result
        expect(component.state.result).toBe(17);
    });

    it('modifyState should update state and output parameters should reflect the changes', () => {

        const component = new TestComponent();

        //arg1 to 7
        expect(component.modifyState("arg1", 7)).toBe(true);

        //Assert result
        expect(component.state.result).toBe(7);

        //arg2 to 8
        expect(component.modifyState("arg2", 8)).toBe(true);
        expect(component.modifyState("arg2", 8)).toBe(false);

        //Assert result
        expect(component.state.result).toBe(15);

        //arg2 to 10
        expect(component.modifyState("arg2", 10)).toBe(true);
        expect(component.modifyState("arg2", 10)).toBe(false);

        //Assert result
        expect(component.state.result).toBe(17);
    });

    it('modifyStateDiff should update state and output parameters should reflect the changes', () => {

        const component = new TestComponent();

        //arg1 to 7
        expect(component.modifyStateDiff({arg1: 7})).toBe(true);

        //Assert result
        expect(component.previousState.arg1).toBe(0);
        expect(component.state.result).toBe(7);
        expect(component.counter).toBe(1);

        //arg2 to 8, result to 0
        expect(component.modifyStateDiff({arg2: 8, result: 0})).toBe(true);
        expect(component.previousState.arg2).toBe(0);

        //Assert result
        expect(component.state.result).toBe(15);
        expect(component.counter).toBe(2);

        //arg1 to 10, arg2 to 11
        expect(component.modifyStateDiff({arg1: 10, arg2: 11})).toBe(true);
        expect(component.previousState.arg1).toBe(7);
        expect(component.previousState.arg2).toBe(8);
        expect(component.counter).toBe(3);

        //Assert result
        expect(component.state.result).toBe(21);
        
        //arg1 to 10, arg2 to 11 (same)

        const prevState = component.state;
        expect(component.modifyStateDiff({ arg1: 10, arg2: 11 })).toBe(false);


        //Assert result
        expect(component.state.result).toBe(21);
        expect(component.counter).toBe(3);
        expect(component.state).toBe(prevState);

        //null
        expect(component.modifyStateDiff(null)).toBe(false);
        expect(component.state.result).toBe(21);
        expect(component.counter).toBe(3);
        expect(component.state).toBe(prevState);
        expect(component.counter).toBe(3);
    });

    it("Recursive update should not start if some key exists in a 'difference' object but state property value has not changed", () => {
        const component = new TestComponentForCycles();

        component.modifyState("arr1", 100);

        expect(component.state.arr1).toBe(100);
    });

    it("Intermediate value change should be detected", () => {
        const component = new TestComponentForCycles2();

        component.modifyState("arr1", 1);
        expect(component.state.arr2).toBe(2);
        expect(component.state.arr3).toBe(3);
    });

    it("Infinite recursive update should be detected", () => {
        const component = new TestComponentForCycles();

        expect(() => component.modifyState("arr3", 1)).toThrow(new Error("Recursion overflow"));
        expect(component.state.arr3).toBe(0);
    });

    it("Calc Properties", () => {
        const component = new TestCalcProps();


        component.modifyStateDiff({arg1: 3, arg2: 7});

        expect(component.state.summ).toBe(10);
        expect(component.state.sub).toBe(-4);
        expect(component.state.summSub).toBe(6);
    });
});


it('If predicate', () => {

    @StateTracking({immediateEvaluation: true, includeAllPredefinedFields: true})
    class Component {

        arg1: number|undefined;

        arg2: number|undefined;

        sum: number|undefined;

        counter = 0;

        @With('arg1', 'arg2').IfNotEqualNull().CallOnInit()
        static calcSum(s: ComponentState<Component>): StateDiff<Component> {
            return {
                sum: s.arg1! + s.arg2!,
                counter: s.counter + 1
            };
        }

        @With<Component>('arg1', 'arg2').If(s => s.counter >= 2).CallOnInit()
        static calcSum2(s: ComponentState<Component>): StateDiff<Component> {
            return {
                sum: s.arg1! + s.arg2! + 100,
                counter: s.counter + 1
            };
        }
    }

    const c = new Component();

    expect(c.counter).toBe(0);
    c.arg1 = 2;
    expect(c.counter).toBe(0);
    c.arg1 = 3;
    expect(c.counter).toBe(0);
    c.arg2 = 2;
    expect(c.counter).toBe(1);
    expect(c.sum).toBe(5);
    c.arg2 = undefined;
    expect(c.counter).toBe(1);
    expect(c.sum).toBe(5);

    c.arg2 = 7;
    expect(c.counter).toBe(3);
    expect(c.sum).toBe(110);
});

class TestComponent extends WithStateBase<TestState> {

    public previousState: TestState;

    public counter = 0;

    constructor() {
        super(new TestState());
    }

    public onValue2(value: number) {
        this.modifyState("arg2", value);
    }

    public onAfterStateApplied(previousState: TestState): void {
        this.previousState = previousState;
        this.counter++;
    }

    public resultChange = new EventEmitter<number>();
}

class TestState {

    public static readonly ngInputs = ["arg1"];

    public static readonly ngOutputs =["resultChange"];

    public readonly arg1: number = 0;

    public readonly arg2: number = 0;

    public readonly result: number = 0;

    @With("arg1", "arg2")
    public static calcResult(currentSate: TestState): Partial<TestState> | null {
        return {
            result: currentSate.arg1 + currentSate.arg2,
        }
    }
}

class TestComponentForCycles extends WithStateBase<TestStateForCycles> {
    constructor() {
        super(new TestStateForCycles());
    }
}

class TestStateForCycles {

    public readonly arr1: number = 0;

    public readonly arr2: number = 0;

    public readonly arr3: number = 0;

    @With("arr1")
    public static calcArr2(currentSate: TestStateForCycles): Partial<TestStateForCycles> | null {
        return {
            arr2: currentSate.arr2+1,
            arr1: currentSate.arr1
        }
    }

    @With("arr3")
    public static calcArr3(currentSate: TestStateForCycles): Partial<TestStateForCycles> | null {
        return {
            arr3: currentSate.arr3 + 1
        }
    }
}

class TestComponentForCycles2 extends WithStateBase<TestStateForCycles2> {
    constructor() {
        super(new TestStateForCycles2());
    }
}

class TestStateForCycles2 {

    public readonly arr1: number = 0;

    public readonly arr2: number = 0;

    public readonly arr3: number = 0;

    @With("arr1")
    public static calcArr2(currentSate: TestStateForCycles2): Partial<TestStateForCycles2> | null {

        if (currentSate.arr1 < 5) {
            return {
                arr1: currentSate.arr1 + 1,
                arr2: currentSate.arr1 === 2 ? 2 : currentSate.arr2
            };
        }
        return null;
    }

    @With("arr2")
    public static calcArr3(currentSate: TestStateForCycles2): Partial<TestStateForCycles2> | null {
        return {
            arr3: currentSate.arr2+1
        }
    }
}

class TestCalcProps extends WithStateBase<TestCalcPropsSate> {
    constructor() {
        super(new TestCalcPropsSate());
    }
}

class TestCalcPropsSate {

    public readonly arg1: number = 0;

    public readonly arg2: number = 0;

    @Calc(["arg1", "arg2"], state => state.arg1 + state.arg2)
    public readonly summ: number = 0;

    @Calc(["arg1", "arg2"], state => state.arg1 - state.arg2)
    public readonly sub: number = 0;

    @Calc(["summ", "sub"], state => state.summ + state.sub)
    public readonly summSub: number;
}
