import { In, Out, With } from "../ngSetState";

export class CalculatorState {

    constructor(diff?: Partial<CalculatorState>) {
        if (diff != null) {
            Object.assign(this, diff);
        }
    }

    public static readonly ngInputs: string[] = ["arg1", "arg2"];
    public static readonly ngOutputs: string[] = [];

    @In("arg1")
    public readonly arg1Ext: number;

    @In("arg2")
    public readonly arg2Ext: number;

    public readonly arg1Text: string;

    public readonly arg2Text: string;

    public readonly arg1Error: boolean;

    public readonly arg2Error: boolean;

    @Out()
    public readonly arg1: number;

    @Out()
    public readonly arg2: number;

    @With("arg1Text")
    public static calcArg1(currentState: CalculatorState): Partial<CalculatorState> | null{


    }

    @With("arg2Text")
    public static calcArg2(currentState: CalculatorState): Partial<CalculatorState> | null {
    }

}
