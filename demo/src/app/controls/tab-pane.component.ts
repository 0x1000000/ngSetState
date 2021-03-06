import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { WithStateBase } from 'ng-set-state';
import { TabPaneState } from "./tab-pane.state";

@Component({
    selector: "tab-pane",
    templateUrl: "./tab-pane.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    inputs: TabPaneState.ngInputs,
    outputs: TabPaneState.ngOutputs
})
export class TabPaneComponent extends WithStateBase<TabPaneState> implements OnChanges
{
    constructor(private readonly _cd: ChangeDetectorRef) {
        super(new TabPaneState(), TabPaneState.ngInputs, TabPaneState.ngOutputs);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public ensureId(): void {
        this.modifyStateDiff(this.state.withEnsuredId());
    }

    public setVisibility(isVisible: boolean): boolean {
        this.modifyState("isVisible", isVisible);
        this._cd.markForCheck();
        return isVisible;
    }

    public onAfterStateApplied?(previousState?: TabPaneState): void {
    }
}
