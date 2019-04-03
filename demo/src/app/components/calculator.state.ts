import { In, Out, With } from "../ngSetState";

export class CalculatorState {

    private static readonly regExNum = new RegExp('^\\d{0,9}$');

    public static readonly ngInputs: string[] = ["arg1", "arg2"];

    public static readonly ngOutputs: string[] = [];

    @In("arg1")
    public readonly arg1Ext: number | null = 0;

    @In("arg2")
    public readonly arg2Ext: number | null = 0;

    public readonly arg1Text: string = "0";

    public readonly arg2Text: string = "0";

    public readonly arg1Error: boolean = false;

    public readonly arg2Error: boolean = false;

    @Out()
    public readonly arg1: number | null;

    @Out()
    public readonly arg2: number | null;

    @With("arg1Text")
    public static calcArg1(currentState: CalculatorState): Partial<CalculatorState> | null {


        if (CalculatorState.regExNum.test(currentState.arg1Text)) {
            return { arg1: parseInt(currentState.arg1Text), arg1Error: false };
        }
        return { arg1: null, arg1Error: true };
    }

    @With("arg2Text")
    public static calcArg2(currentState: CalculatorState): Partial<CalculatorState> | null {
        return null;
    }

}
