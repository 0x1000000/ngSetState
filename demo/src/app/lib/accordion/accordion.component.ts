import { ChangeDetectionStrategy, Component, ChangeDetectorRef, OnDestroy, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { BindToShared, ComponentState, ComponentStateDiff, initializeStateTracking, releaseStateTracking, With } from 'ng-set-state';
import { AccordionPaneComponent } from './accordion-pane.component';
import { AccordionState } from './accordion-state';

type State = ComponentState<AccordionComponent>;
type NewState = ComponentStateDiff<AccordionComponent>;

@Component({
  selector: 'accordion',
  templateUrl: './accordion.component.html',
  providers: [AccordionState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccordionComponent implements OnDestroy, AfterContentInit {

  constructor(accordionState: AccordionState, cd: ChangeDetectorRef) {
    initializeStateTracking(this, {sharedStateTracker: accordionState, onStateApplied: () => cd.detectChanges()})
      .subscribeSharedStateChange();
  }

  @ContentChildren(AccordionPaneComponent)
  public readonly panesQuery: QueryList<AccordionPaneComponent>|null = null;

  @BindToShared()
  selectedPane: AccordionPaneComponent|null = null;

  @BindToShared()
  firstPane: AccordionPaneComponent|null = null;

  panes: AccordionPaneComponent[] = [];

  @With('panes')
  static onPanesChange(state: State): NewState{

    if (state.panes.length < 0){
      return{
        selectedPane: null,
        firstPane: null
      };
    }

    let selectedPane = state.selectedPane;

    if (selectedPane == null){
      selectedPane = state.panes[0];
    }

    return {
      firstPane: state.panes[0],
      selectedPane
    };
  }

  ngOnDestroy(): void {
    releaseStateTracking(this);
  }

  ngAfterContentInit(): void {
    this.panesQuery?.changes.subscribe(() => {this.panes = this.panesQuery!.toArray(); });
    this.panes = this.panesQuery?.toArray() ?? [];
  }
}
