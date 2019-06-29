import { Component, QueryList, ChangeDetectionStrategy, ContentChildren, AfterContentInit } from '@angular/core';
import { TabPaneComponent } from "./tab-pane.component";
import { WithStateBase } from "ng-set-state/dist/ngSetState";
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

    constructor() {
        super(new TabsState(), TabsState.ngInputs, TabsState.ngOutputs);
    }

    public ngAfterContentInit(): void {
        this.onPaneChanged();
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
