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
});

class TestComponent extends WithStateBase<TestState> {

    constructor() {
        super(new TestState(), TestState.ngInputs, TestState.ngOutputs);
    }

    public onValue2(value: number) {
        this.modifyState("arg2", value);
    }
}

interface ITestComponent extends IWithState<TestState>{
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
            result: currentSate.arg1 + currentSate.arg2
        }
    }

}