import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter  } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, StateTracking, With } from "ng-set-state";

export type Operation = "add" | "sub";

type State = ComponentState<CalculatorComponent>;
type NewState = ComponentStateDiff<CalculatorComponent>;

@Component({
    selector: 'calculator',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator.component.html",
})
export class CalculatorComponent {
    private static readonly regExNum = new RegExp('^\\d{1,9}$');

    public readonly operations: { id: Operation, title: string }[] = [{ id: "add", title: "Plus (+)" }, { id: "sub", title: "Minus (-)" }];

    constructor(){
        initializeStateTracking(this);
    }

    @Input("arg1")
    public arg1Ext: number | null = null;

    public arg1Text: string = "0"; 

    public arg1Error: boolean = false;

    public arg1: number | null = null;
    @Output() public arg1Change = new EventEmitter<number | null>();

    @Input()
    public operation: Operation = "add";
    @Output()
    public readonly operationChange = new EventEmitter<Operation>();

    @Input("arg2")
    public arg2Ext: number | null = null;

    public arg2Text: string = "0";    

    public arg2Error: boolean = false;

    public arg2: number | null = null;
    @Output()
    public readonly arg2Change = new EventEmitter<number | null>();

    public result: number | null = null;

    @Output("result") 
    public readonly resultChange = new EventEmitter<number | null>();

    public onInput(prop: 'arg1Text'|'arg2Text', e: Event): void {
        this[prop] = (e.target as HTMLInputElement).value;
    }

    //Functions

    @With("arg1Text").Debounce(500)
    public static calcArg1(currentState: State): NewState | null {

        if (currentState.arg1Text && CalculatorComponent.regExNum.test(currentState.arg1Text)) {
            return { arg1: parseInt(currentState.arg1Text), arg1Error: false };
        }
        return { arg1: null, arg1Error: true };
    }

    @With("arg2Text").Debounce(500)
    public static calcArg2(currentState: State): NewState | null {
        if (currentState.arg2Text != null && currentState.arg2Text !== "" && CalculatorComponent.regExNum.test(currentState.arg2Text)) {
            return { arg2: parseInt(currentState.arg2Text), arg2Error: false };
        }
        return { arg2: null, arg2Error: true };
    }

    @With("arg1Ext")
    public static fromArg1Ext(currentState: State): NewState | null {
        return {
            arg1: currentState.arg1Ext,
            arg1Text: currentState.arg1Ext == null ? "" : currentState.arg1Ext.toString()
        }
    }

    @With("arg2Ext")
    public static fromArg2Ext(currentState: State): NewState | null {
        return {
            arg2: currentState.arg2Ext,
            arg2Text: currentState.arg2Ext == null ? "" : currentState.arg2Ext.toString()
        }
    }

    @With("arg1", "arg2", "operation")
    public static calcSumWithArh1(currentState: State): NewState | null {
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
