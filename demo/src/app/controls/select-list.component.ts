import { Component, ChangeDetectionStrategy, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { SelectListState, ViewItem } from './select-list.state';

@Component({
    selector: 'select-list',
    templateUrl: "./select-list.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    inputs: SelectListState.ngInputs,
    outputs: SelectListState.ngOutputs
})
export class SelectListComponent extends WithStateBase<SelectListState> implements OnInit {
    public state: SelectListState;

    constructor(private readonly _elementRef: ElementRef, private readonly _cd: ChangeDetectorRef) {
        super(new SelectListState(), SelectListState.ngInputs, SelectListState.ngOutputs);
    }

    public ngOnInit(): void {
        this._cd.detach();
        this.modifyState("rootElement", this._elementRef.nativeElement);
    }

    public onAfterStateApplied?(previousState?: SelectListState): void {
        this._cd.detectChanges();
    }

    public onItemInit(viewItem: ViewItem, element: HTMLElement) {
        this.modifyStateDiff(this.state.onItemInit(viewItem, element));
    }

    public onItemMouseEnter(viewItem: ViewItem) {
        this.modifyStateDiff(this.state.onItemMouseEnter(viewItem));
    }

    public onItemClick(viewItem: ViewItem) {
        this.modifyStateDiff(this.state.onItemSelect(viewItem));
    }
}
