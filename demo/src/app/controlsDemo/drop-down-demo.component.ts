import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnChanges, SimpleChanges, OnInit, AfterViewInit, ViewChild} from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { DropDownDemoState } from "./drop-down-demo.state";

@Component({
    selector: 'drop-down-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./drop-down-demo.component.html",
    inputs: DropDownDemoState.ngInputs,
    outputs: DropDownDemoState.ngOutputs,
})
export class DropDownDemoComponent extends WithStateBase<DropDownDemoState> implements OnInit, OnChanges, OnDestroy, AfterViewInit {

    public state: DropDownDemoState;

    public isDestroyed: boolean = false;

    constructor(private _cd: ChangeDetectorRef) {
        super(new DropDownDemoState(), DropDownDemoState.ngInputs, DropDownDemoState.ngOutputs);
    }

    @ViewChild("itemTemplateCustom", { static: true })
    public itemTemplateCustom: any;
    
    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    public ngOnInit(): void {
        this._cd.detach();
        this._cd.detectChanges();
    }

    public ngAfterViewInit(): void {
        this.modifyState("itemTemplateCustom", this.itemTemplateCustom);
    }

    public onAfterStateApplied?(previousState?: DropDownDemoState): void {
        if (!this.isDestroyed) {
            this._cd.detectChanges();
        }
    }
}
