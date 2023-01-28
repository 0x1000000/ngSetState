import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy } from '@angular/core';
import { BindToShared, ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, releaseStateTracking, With, WithAsync } from 'ng-set-state';
import { delayMs } from '../helpers';
import { TabPaneComponent } from './tab-pane.component';
import { TabsState } from './tabs-state.class';

type State = ComponentState<TabLabelComponent>;
type NewState = ComponentStateDiff<TabLabelComponent>;

@Component({
  selector: 'tab-label',
  templateUrl: './tab-label.component.html'
})
export class TabLabelComponent implements OnDestroy, TabsState {

  constructor(cd: ChangeDetectorRef, tabsState: TabsState, elementRef: ElementRef) {
      this.element = elementRef.nativeElement;

      const handler = initializeStateTracking<TabLabelComponent>(this, {
        sharedStateTracker: tabsState,
        onStateApplied: () => cd.detectChanges()});

      handler.subscribeSharedStateChange();
  }

  @Input()
  public pane: TabPaneComponent|null = null;

  @Input()
  public index: number|null = null;

  @BindToShared()
  public selectedPane: TabPaneComponent|null = null;

  @BindToShared()
  previewPane: TabPaneComponent|null = null;

  @BindToShared()
  public inkPosition: [number, number]|null = null;

  @IncludeInState()
  public readonly element: HTMLDivElement;

  public label: string|null = null;

  public isSelected = false;

  public isPreview = false;

  @With('pane', 'selectedPane')
  // Renders ink in the old position + checks isSelected
  public static onSelectedPanePrev(state: State, prevState: State): NewState{
    const isSelected = state.pane != null && state.selectedPane === state.pane;

    if (prevState.selectedPane !== prevState.pane || prevState.pane == null){
      return {
        isSelected
      };
    }
    return {
      inkPosition: [prevState.element.offsetLeft, prevState.element.offsetWidth],
      isSelected
    };
  }

  @WithAsync('selectedPane')
  // Renders ink in the new position (with css animation)
  public static async onSelectedPaneOrLabel(getState: () => State): Promise<NewState>{

    const state = getState();

    if (state.selectedPane !== state.pane || state.pane == null){
      return null;
    }

    await delayMs(0); // To Render
    return {
      inkPosition: [state.element.offsetLeft, state.element.offsetWidth]
    };
  }

  @With('pane', 'previewPane')
  public static onPreviewPane(s: State): NewState{
    return {
      isPreview: s.pane != null && s.previewPane != null && s.pane === s.previewPane
    };
  }

  @With('pane', 'index')
  public static buildLabel(state: State): NewState{

    let newLabel = state.pane?.label;
    if (newLabel == null || newLabel === ''){
        if (state.index != null){
          newLabel = state.index.toString();
        }
    }

    return {
      label: newLabel
    };
  }

  public ngOnDestroy(): void {
    releaseStateTracking(this);
  }
}
