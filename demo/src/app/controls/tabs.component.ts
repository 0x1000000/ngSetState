import { Component, QueryList, ChangeDetectionStrategy, ContentChildren, AfterContentInit, ChangeDetectorRef } from '@angular/core';
import { TabPaneComponent } from "./tab-pane.component";
import { WithStateBase } from "ng-set-state";
import { TabsState, TabLabel } from "./tabs.state";

@Component({
    selector: "tabs",
    templateUrl: "./tabs.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    inputs: TabsState.ngInputs,
    outputs: TabsState.ngOutputs

})
export class TabsComponent extends WithStateBase<TabsState> implements AfterContentInit
{
    @ContentChildren(TabPaneComponent)
    public readonly panesQuery:QueryList<TabPaneComponent>;

    constructor(private readonly _cd: ChangeDetectorRef) {
        super(new TabsState(), TabsState.ngInputs, TabsState.ngOutputs);
    }

    public ngAfterContentInit(): void {
        setTimeout(() => {
            this.onPaneChanged();
            this._cd.markForCheck();
        });
        this.panesQuery.changes.subscribe(this.onPaneChanged);
    }

    public readonly onPaneChanged = () => {
        this.modifyState("panes", this.panesQuery.toArray());
    };

    public onLabelClick(labelElement: HTMLElement, label: TabLabel) {
        this.modifyStateDiff({
            selectedId: label.id,
            barOffset: labelElement.offsetLeft,
            barWidth: labelElement.offsetWidth
        });
    }
}
