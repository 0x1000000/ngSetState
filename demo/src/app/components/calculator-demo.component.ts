import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'calculator-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./calculator-demo.component.html",
})
export class CalculatorDemoComponent {

    public arg1: number | null = 0;

    public arg2: number | null = 0;

    public operation: "add" | "sub" = "add";

    public result1: number;

    public result2: number;
}
