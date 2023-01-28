import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, TemplateRef } from '@angular/core';
import { BindToShared, ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, releaseStateTracking, With } from 'ng-set-state';
import { TabPaneLabelContext } from './tab-pane-label.directive';
import { TabsState } from './tabs-state.class';

type State = ComponentState<TabPaneComponent>;
type NewState = ComponentStateDiff<TabPaneComponent>;

@Component({
  selector: 'tab-pane',
  templateUrl: './tab-pane.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabPaneComponent implements OnDestroy, TabsState {

  get isSelected(): boolean {
    return this === this.selectedPane;
  }

  constructor(cd: ChangeDetectorRef, tabsState: TabsState)
  {
      const handler = initializeStateTracking<TabPaneComponent>(this, {
        onStateApplied: () => cd.detectChanges(),
        sharedStateTracker: tabsState});

      handler.subscribeSharedStateChange();
  }

  @Input()
  id: any;

  @Input()
  label: string | null | undefined = null;

  @Input()
  labelTemplate: TemplateRef<TabPaneLabelContext> | null = null;

  @Input()
  href: string | null = null;

  labelTemplateCtx: TabPaneLabelContext | null = null;

  @BindToShared()
  selectedPane: TabPaneComponent|null = null;

  @BindToShared()
  previewPane: TabPaneComponent|null = null;

  @BindToShared()
  inkPosition: [number, number]|null = null;

  @IncludeInState()
  visible = false;

  @IncludeInState()
  readonly thisRef: TabPaneComponent = this;

  @With('selectedPane')
  static onSelectedPane(state: State): NewState{
    return {
      visible: state.selectedPane === state.thisRef
    };
  }

  @With('labelTemplate', 'label', 'id')
  static onItemTemplate(state: State): NewState{
    if (state.labelTemplate != null){
      return {
        labelTemplateCtx: {
          label: state.label,
          id: state.id
        }
      };
    }
    if (state.labelTemplateCtx != null){
      return {labelTemplateCtx: null};
    }
    return null;
  }

  ngOnDestroy(): void {
    releaseStateTracking(this);
  }
}
