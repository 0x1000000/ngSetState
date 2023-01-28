import { ChangeDetectionStrategy, ChangeDetectorRef, Component, QueryList, ContentChildren, Input, EventEmitter, Output, OnDestroy, AfterContentInit } from '@angular/core';
import { ComponentState, ComponentStateDiff, BindToShared, initializeStateTracking, With, releaseStateTracking } from 'ng-set-state';
import { TabPaneComponent } from './tab-pane.component';
import { TabsState } from './tabs-state.class';

type State = ComponentState<TabsComponent>;
type NewState = ComponentStateDiff<TabsComponent>;

@Component({
  selector: 'tabs',
  templateUrl: './tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TabsState],
  // tslint:disable-next-line: no-host-metadata-property
  host: {class: 'disable-text-selection'}
})
export class TabsComponent implements TabsState, OnDestroy, AfterContentInit {

  constructor(cd: ChangeDetectorRef, tabsState: TabsState) {
    const handler = initializeStateTracking<TabsComponent>(this, {
      onStateApplied: () => cd.detectChanges(),
      sharedStateTracker: tabsState});

    handler.subscribeSharedStateChange();
  }

  @ContentChildren(TabPaneComponent)
  public panesQuery: QueryList<TabPaneComponent> | null = null;

  public panes: TabPaneComponent[] = [];

  @Input()
  public selectedId: any;

  @Output()
  readonly selectedIdChange = new EventEmitter<any>();

  @Output()
  readonly linkClick = new EventEmitter<string>();

  @BindToShared()
  selectedPane: TabPaneComponent|null = null;

  @BindToShared()
  previewPane: TabPaneComponent|null = null;

  @BindToShared()
  inkPosition: [number, number]|null = null;

  @With('panes')
  public static onPanesChanged(state: State): NewState{
    let selectedPane: TabPaneComponent|null = null;

    if (state.panes.length > 0){

      // Sync with Id if selectedPane is null
      if (state.selectedPane == null && state.selectedId != null){
        selectedPane = TabsComponent.findPaneById(state);
      }

      // Ensure previous selected pane is a part of updated ones
      if (state.selectedPane != null) {
        if (state.panes.indexOf(state.selectedPane) <= 0){
          selectedPane = TabsComponent.findPaneById(state);
        }
      }

      // First tab by default
      if (selectedPane == null){
        selectedPane = state.panes[0];
      }
    }
    return { selectedPane };
  }

  @With('selectedPane')
  public static onSelectedChanged(state: State): NewState{
    if (state.selectedPane != null) {

      let newSelectedId: any;

      if (state.selectedPane.id != null){
        newSelectedId = state.selectedPane.id;
      }else{
        newSelectedId = state.panes.indexOf(state.selectedPane);
      }

      return {
        selectedId: newSelectedId,
        previewPane: null
      };
    }

    if (state.panes.length < 1){// No Panes yet
      return null;
    }

    return {
      inkPosition: null,
      selectedId: null,
      previewPane: null
    };
  }

  @With('selectedId')
  public static onSelectedIdChange(state: State): NewState{
    if (state.selectedId == null){
      return {selectedPane: null};
    }
    else if (state.selectedPane != null && state.selectedPane.id === state.selectedId){
      return null;
    }

    let newSelectedId = state.selectedId;

    let newSelectedPane = state.panes.find(p => p.id != null && p.id === state.selectedId);

    if (newSelectedPane === null
      && typeof state.selectedId === 'number'
      && state.panes.length > state.selectedId
      && state.selectedId >= 0)
    {
      newSelectedPane = state.panes[state.selectedId];
    }

    if (newSelectedPane == null){
      if (state.selectedPane != null){
        newSelectedPane = state.selectedPane;
        newSelectedId = state.selectedPane?.id;
        if (newSelectedId == null){
          newSelectedId = state.panes.indexOf(state.selectedPane);
        }
      }
    }

    return {
      selectedPane: newSelectedPane,
      selectedId: newSelectedId
    };
  }

  // It hides ink in 500ms
  @With('inkPosition').Debounce(500)
  public static hideInk(state: State): NewState{
    if (state.inkPosition == null){
      return null;
    }

    return {inkPosition: null};
  }

  private static findPaneById(state: State): TabPaneComponent|null{
    let paneById: TabPaneComponent|null = null;
    for (let i = 0; i < state.panes.length; i++) {
      const pane = state.panes[i];
      if (pane.id == null && i === state.selectedId){
        paneById = pane;
      }
      if (pane.id != null && pane.id === state.selectedId){
        paneById = pane;
        break;
      }
    }
    return paneById;
  }

  public ngOnDestroy(): void {
    releaseStateTracking(this);
  }

  public ngAfterContentInit(): void {
    this.panesQuery?.changes.subscribe(() => {
      this.panes = this.panesQuery!.toArray();
    });
    this.panes = this.panesQuery!.toArray();
  }

  public onTabLabelClick(pane: TabPaneComponent): void{
    this.selectedPane = pane;
  }

  public onLinkClick(ev: MouseEvent, pane: TabPaneComponent): void{
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    if (this.previewPane !== pane && pane.href && !pane.isSelected){
      this.previewPane = pane;
      this.linkClick.emit(pane.href);
    }
  }
}
