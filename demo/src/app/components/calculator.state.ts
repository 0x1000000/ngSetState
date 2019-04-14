import { In, Out, With } from "ng-set-state";

export type Operation = "add" | "sub";

export class CalculatorState {

    private static readonly regExNum = new RegExp('^\\d{1,9}$');

    public static readonly ngInputs: string[] = ["arg1", "arg2", "operation"];

    public static readonly ngOutputs: string[] = ["arg1Change", "arg2Change", "operationChange", "result"];

    @In("arg1")
    public readonly arg1Ext: number | null = null;

    @In("arg2")
    public readonly arg2Ext: number | null = null;

    public readonly arg1Text: string = "0";

    public readonly arg2Text: string = "0";

    public readonly arg1Error: boolean = false;

    public readonly arg2Error: boolean = false;

    @In()
    @Out()
    public readonly operation: Operation = "add";

    @Out()
    public readonly arg1: number | null = null;

    @Out()
    public readonly arg2: number | null = null;

    @Out("result")
    public readonly result: number | null = null;

    public readonly operations: { id: Operation, title }[] = [{ id: "add", title: "Plus (+)" }, { id: "sub", title: "Minus (-)" }];

    @With("arg1Text")
    public static calcArg1(currentState: CalculatorState): Partial<CalculatorState> | null {

        if (currentState.arg1Text && CalculatorState.regExNum.test(currentState.arg1Text)) {
            return { arg1: parseInt(currentState.arg1Text), arg1Error: false };
        }
        return { arg1: null, arg1Error: true };
    }

    @With("arg2Text")
    public static calcArg2(currentState: CalculatorState): Partial<CalculatorState> | null {
        if (currentState.arg2Text != null && currentState.arg2Text !== "" && CalculatorState.regExNum.test(currentState.arg2Text)) {
            return { arg2: parseInt(currentState.arg2Text), arg2Error: false };
        }
        return { arg2: null, arg2Error: true };
    }

    @With("arg1Ext")
    public static fromArg1Ext(currentState: CalculatorState): Partial<CalculatorState> | null {
        return {
            arg1: currentState.arg1Ext,
            arg1Text: currentState.arg1Ext == null ? "" : currentState.arg1Ext.toString()
        }
    }

    @With("arg2Ext")
    public static fromArg2Ext(currentState: CalculatorState): Partial<CalculatorState> | null {
        return {
            arg2: currentState.arg2Ext,
            arg2Text: currentState.arg2Ext == null ? "" : currentState.arg2Ext.toString()
        }
    }

    @With("arg1", "arg2", "operation")
    public static calcSumWithArh1(currentState: CalculatorState): Partial<CalculatorState> | null {
        if (currentState.arg1 != null && currentState.arg2 != null) {

            let result: number;

            switch (currentState.operation) {
                case "add":
                    result = currentState.arg1 + currentState.arg2;
                    break;
                case "sub":
                    result = currentState.arg1 - currentState.arg2;
                    break;
                default:
                    throw new Error("Unknown operation: " + currentState.operation);
            }
            return { result: result };
        } else {
            return { result: null };
        }
        
    }

}
