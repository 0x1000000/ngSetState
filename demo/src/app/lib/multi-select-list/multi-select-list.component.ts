import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Output, EventEmitter } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import { arraysAreEqual, extractMandatoryMember } from '../helpers';

export type State = ComponentState<MultiSelectListComponent>;
export type NewState = ComponentStateDiff<MultiSelectListComponent>;

export type ViewItem = {
  model: any,
  id: any,
  text: string,
  focused: boolean,
  selected: boolean,
  element?: HTMLElement,
  templateContext: object };

@Component({
  selector: 'multi-select-list',
  templateUrl: './multi-select-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelectListComponent {

  constructor(cd: ChangeDetectorRef) {
    initializeStateTracking(this, {
      includeAllPredefinedFields: true,
      onStateApplied: () => cd.detectChanges()});
  }

  @Input()
  items: any[] | null = null;

  @Input()
  idMember: string | null = null;

  @Input()
  textMember: string | null = null;

  @Input()
  selected: any[] | null = null;

  @Output()
  readonly selectedChange = new EventEmitter<any[]|null>();

  selectedItem: any[]|null = null;

  selectedItemSyncBySelected: any[]|null = null;

  @Output()
  selectedItemChange = new EventEmitter<any>();

  viewItems: ViewItem[] | null = null;

  @With('items', 'idMember', 'textMember')
  public static buildViewItems(currentState: State): NewState {

      if (currentState.items == null || currentState.items.length < 1) {
          return {viewItems: []};
      }

      const viewItems: ViewItem[] = currentState.items.map(i => ({
          model: i,
          id: extractMandatoryMember(i, currentState.idMember),
          text: extractMandatoryMember(i, currentState.textMember).toString(),
          focused: false,
          selected: MultiSelectListComponent.checkModelIsSelected(currentState, i),
          templateContext: { $implicit: i, text: extractMandatoryMember(i, currentState.textMember).toString() }
      }));
      return { viewItems };
  }

  @With('selected', 'idMember', 'viewItems')
  public static onCalcSelectItem(state: State): NewState{

    if (state.selected == null || !Array.isArray(state.selected) || state.selected.length < 1 || state.viewItems == null){
      return {
        selectedItem: null
      };
    }

    let newSelectedItem: any[]|null = [];

    for (const viewItem of state.viewItems) {
      if (state.selected.some(sid => sid === viewItem.id)){
        newSelectedItem.push(viewItem.model);
        viewItem.selected = true;
      }
      else{
        viewItem.selected = false;
      }
    }

    if (newSelectedItem.length === 0){
      newSelectedItem = null;
    }

    return {
      selectedItem: newSelectedItem,
      selectedItemSyncBySelected: newSelectedItem
    };

  }


  @With('selectedItem', 'idMember')
  public static calcSelect(state: State): NewState{

    if (state.selectedItem === state.selectedItemSyncBySelected){
      return null;
    }

    let newSelected = state.selected;

    if (state.idMember == null || state.idMember === ''){
        newSelected = state.selectedItem;
    }
    else{
      newSelected = state.selectedItem?.map(i => extractMandatoryMember(i, state.idMember)) ?? null;
    }

    if (!arraysAreEqual(newSelected, state.selected)){
      return {selected: newSelected};
    }
    return null;
  }

  private static checkModelIsSelected(state: State, model: object): boolean {

    if (state.selected == null || state.selected.length < 1) {
      return false;
    }

    return state.selected.some(i => extractMandatoryMember(model, state.idMember) === i);
  }

  onCheckedChange(item: ViewItem, checked: boolean): void{
    if (item.selected === checked){
      return;
    }

    item.selected = checked;

    let selectedItem = this.viewItems?.filter(i => i.selected).map(i => i.model) ?? null;

    if (selectedItem?.length === 0){
      selectedItem = null;
    }

    this.selectedItem = selectedItem;
  }
}
