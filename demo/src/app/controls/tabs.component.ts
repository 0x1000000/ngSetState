import { Component, QueryList, ChangeDetectionStrategy, ContentChildren, AfterContentInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
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
export class TabsComponent extends WithStateBase<TabsState> implements AfterContentInit, OnChanges
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
        });//
        this.panesQuery.changes.subscribe(this.onPaneChanged);
    }

    public onLabelCreated(label: TabLabel, labelElement: HTMLElement): void {
        const diff = this.state.onLabelCreated(label, labelElement);
        if (diff != null) {
            this.modifyStateDiff(diff);
            this._cd.detectChanges();
        }
    }

    public onLabelDestroyed(label: TabLabel, labelElement: HTMLElement): void {
        const diff = this.state.onLabelDestroyed(label, labelElement);
        if (diff != null) {
            this.modifyStateDiff(diff);
            this._cd.detectChanges();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public readonly onPaneChanged = () => {
        this.modifyState("panes", this.panesQuery.toArray());
    };

    public onLabelClick(labelElement: HTMLElement, label: TabLabel) {
        this.modifyState("selectedId", label.id);
    }
}
