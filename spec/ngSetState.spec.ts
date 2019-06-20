import { SimpleChange, EventEmitter} from "@angular/core"
import { With, WithStateBase, IWithState, In, Out } from "./../src/ngSetState";
import { } from "jasmine";

describe('Tests', () => {
    it('Component properties should be initialized and result should be reflect arguments', () => {

        let result: number = -100;
        const component = new TestComponent() as any as ITestComponent;

        //Assert initial values

        expect(component.arg1).toBe(0);
        expect(component.resultChange).toBeDefined();

        //Outputs subscription
        (component).resultChange.subscribe((value) => result = value);

        //arg1 to 7
        component.ngOnChanges({ "arg1": new SimpleChange(undefined, 7, true) });

        //arg2 to 8
        component.onValue2(8);

        //Assert result
        expect(result).toBe(15);

        //arg2 to 10
        component.onValue2(10);

        //Assert result
        expect(result).toBe(17);
    });

    it('modifyState should update state and output parameters should reflect the changes', () => {

        let result: number = -100;
        const component = new TestComponent() as any as ITestComponent;


        //Outputs subscription
        (component).resultChange.subscribe((value) => result = value);

        //arg1 to 7
        component.modifyState("arg1", 7);

        //Assert result
        expect(result).toBe(7);

        //arg2 to 8
        component.modifyState("arg2", 8);

        //Assert result
        expect(result).toBe(15);

        //arg2 to 10
        component.modifyState("arg2", 10);

        //Assert result
        expect(result).toBe(17);
    });

    it('modifyStateDiff should update state and output parameters should reflect the changes', () => {

        let result: number = -100;
        const component = new TestComponent() as any as ITestComponent;
        let counter = 0;


        //Outputs subscription
        (component).resultChange.subscribe((value) => {
            counter++;
            return result = value;
        });

        //arg1 to 7
        component.modifyStateDiff({arg1: 7});

        //Assert result
        expect(result).toBe(7);

        expect(counter).toBe(1);
        expect(component.previousState.arg1).toBe(0);

        //arg2 to 8, result to 0
        component.modifyStateDiff({arg2: 8, result: 0});
        expect(component.previousState.arg2).toBe(0);

        //Assert result
        expect(result).toBe(15);

        expect(counter).toBe(2);

        //arg1 to 10, arg2 to 11
        component.modifyStateDiff({arg1: 10, arg2: 11});
        expect(component.previousState.arg1).toBe(7);
        expect(component.previousState.arg2).toBe(8);

        //Assert result
        expect(result).toBe(21);
        expect(counter).toBe(3);

        //arg1 to 10, arg2 to 11 (same)

        const prevState = component.state;
        component.modifyStateDiff({arg1: 10, arg2: 11});

        //Assert result
        expect(result).toBe(21);
        expect(counter).toBe(3);
        expect(component.state).toBe(prevState);

        //null
        component.modifyStateDiff(null);
        expect(result).toBe(21);
        expect(counter).toBe(3);
    });

    it("Recursive update should not start if some key exists in a 'difference' object but state property value has not changed", () => {
        const component = new TestComponentForCycles();

        component.modifyState("arr1", 100);

        expect(component.state.arr1).toBe(100);
    });

    it("Infinite recursive update should be detected", () => {
        const component = new TestComponentForCycles();

        expect(() => component.modifyState("arr3", 1)).toThrow(new Error("Recursion overflow"));
        expect(component.state.arr3).toBe(0);
    });
});

class TestComponent extends WithStateBase<TestState> {

    public previousState: TestState;

    constructor() {
        super(new TestState(), TestState.ngInputs, TestState.ngOutputs);
    }

    public onValue2(value: number) {
        this.modifyState("arg2", value);
    }

    public onAfterStateApplied?(previousState: TestState): void {
        this.previousState = previousState;
    }
}

interface ITestComponent extends IWithState<TestState>{

    previousState: TestState;

    arg1: number;

    resultChange: EventEmitter<number>;

    onValue2(value: number);
}

class TestState {

    public static readonly ngInputs = ["arg1"];

    public static readonly ngOutputs =["resultChange"];

    @In()
    public readonly arg1: number = 0;

    public readonly arg2: number = 0;

    @Out()
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
        super(new TestStateForCycles(), [], []);
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