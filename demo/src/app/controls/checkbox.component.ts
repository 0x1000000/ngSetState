import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy, HostBinding, HostListener } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { CheckboxState } from "./checkbox.state";

@Component({
    selector: 'checkbox',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./checkbox.component.html",
    inputs: CheckboxState.ngInputs,
    outputs: CheckboxState.ngOutputs,
})
export class CheckboxComponent extends WithStateBase<CheckboxState> implements OnChanges, OnDestroy {

    public isDestroyed: boolean = false;

    constructor(private _cd: ChangeDetectorRef) {
        super(new CheckboxState(), CheckboxState.ngInputs, CheckboxState.ngOutputs);
        this._cd.detach();
    }
    
    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    public onAfterStateApplied?(previousState?: CheckboxState): void {
        if (!this.isDestroyed) {
            this._cd.detectChanges();
        }
    }

    @HostBinding("tabindex")
    public readonly tabindex = "0";

    @HostListener("click")
    public onClick(): void {
        this.modifyStateDiff(this.state.toggle());
    }

    @HostListener("keydown", ['$event'])
    public onKeyDown(e: KeyboardEvent) {
        if (e.keyCode === 13 /*Enter*/ || e.keyCode === 32 /*Space*/) {
            this.modifyStateDiff(this.state.toggle());
        }
    }
}
