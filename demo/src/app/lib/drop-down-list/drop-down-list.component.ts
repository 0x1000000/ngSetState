import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Calc, ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import {  extractMandatoryMember } from '../helpers';

type State= ComponentState<DropDownListComponent>;
type NewState= ComponentStateDiff<DropDownListComponent>;


@Component({
  selector: 'drop-down-list',
  templateUrl: './drop-down-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropDownListComponent implements OnInit, OnDestroy {

  constructor(private _cd: ChangeDetectorRef) {
    initializeStateTracking<DropDownListComponent>(this, {
        onStateApplied: (() => {
            if (this.isInit){
                this._cd.detectChanges();
            }
            }),
        includeAllPredefinedFields: true,
        immediateEvaluation: true });

    this._cd.detach();
  }

  isInit = false;

  isDestroyed = false;

  @Input()
  selected: any = null;

  @Output()
  selectedChange = new EventEmitter<any>();

  @Input()
  items: any[] | null = null;

  @Input()
  multi = false;

  @Input()
  idMember: string | null = null;

  @Input()
  textMember: string | null = null;

  @Input()
  itemTemplate: any | null = null;

  @Input()
  noneText: any = '(none)';

  @Input()
  showNullSelection = false;

  @Input()
  disabled = false;

  @Input()
  isError = false;

  isOpen = false;

  text: string = this.noneText;

  selectedItem: any = null;

  actualMaxDropHeightPx = 300;

  @Calc(['items', 'disabled'], s => s.disabled || s.items == null || !Array.isArray(s.items) || s.items.length < 1)
  openDisabled = true;

  @Calc(['itemTemplate', 'selectedItem', 'text'], s => s.itemTemplate != null ? ({$implicit: s.selectedItem, text: s.text}) : null)
  inputTemplateContext: {$implicit: any, text: string}|null = null;

  @With('selectedItem')
  static onSelectedItemSetText(currentState: State): NewState {
      return {
          text: currentState.selectedItem
            ? currentState.multi && Array.isArray(currentState.selectedItem)
                ? currentState.selectedItem.map(i => extractMandatoryMember(i, currentState.textMember).toString()).join(', ')
                : extractMandatoryMember(currentState.selectedItem, currentState.textMember).toString()
            : currentState.noneText,
          isOpen: currentState.isOpen && currentState.multi
      };
  }

  @With('selected', 'items')
  static syncSelectedItem(currentState: State): NewState {
      const newSelectedItem = currentState.items != null && currentState.selected != null
            ? Array.isArray(currentState.selected) && currentState.selected.length > 0
                ? currentState.items.filter(i => currentState.selected.some((x: any) => extractMandatoryMember(i, currentState.idMember) === x)) ?? null
                : currentState.items.find(i => extractMandatoryMember(i, currentState.idMember) === currentState.selected) ?? null
          : null;

      return { selectedItem: newSelectedItem };
  }

  @With('disabled')
  static closeOnDisabled(currentState: State): NewState{
    if (currentState.disabled && currentState.isOpen){
      return {isOpen: false};
    }
    return null;
  }

  @With('noneText')
  static initNoneText(currentState: State): NewState{
    if (currentState.selected == null){
      return {text: currentState.noneText};
    }
    return null;
  }

  ngOnInit(): void {
    if (!this.isDestroyed) {
        this.isInit = true;
    }
  }

  ngOnDestroy(): void {
      this.isDestroyed = true;
  }

  toggle(): void {
    if (this.openDisabled) {
        this.isOpen = false;
    }
    else{
        this.isOpen = !this.isOpen;
    }
  }
}
