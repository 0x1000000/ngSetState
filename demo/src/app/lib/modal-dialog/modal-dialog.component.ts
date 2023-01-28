import { HostListener } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, With, WithState } from 'ng-set-state';
import { focusFirstDescendantOrSelf } from '../helpers';
import { PopupService } from '../popup.service';

export type ModalDialogButton = {
  readonly id: string,
  readonly title: string,
  readonly primary: boolean,
};

type State= ComponentState<ModalDialogComponent>;
type NewState= ComponentStateDiff<ModalDialogComponent>;

@Component({
  selector: 'modal-dialog',
  templateUrl: './modal-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalDialogComponent {

  constructor(cd: ChangeDetectorRef, private readonly _popupService: PopupService) {
    initializeStateTracking(this, { onStateApplied: () => cd.detectChanges() });
  }

  dialogPopupElement: HTMLElement|null = null;

  @Input()
  title = '';

  @Input()
  @IncludeInState()
  buttons: null | 'close'|'cancel-ok'|'no-yes'| ModalDialogButton[] = null;

  @Output()
  readonly buttonClick = new EventEmitter<string>();

  @IncludeInState()
  @Input()
  isOpen = false;

  @IncludeInState()
  actualButtons: ModalDialogButton[]|null = null;

  currentPromise: Promise<any> | null = null;

  currentResolver: ((result: any) => void) | null = null;

  @With('buttons')
  static buildButtons(state: State): NewState {
    if (typeof state.buttons === 'string'){

      let actualButtons: ModalDialogButton[];
      switch (state.buttons){
        case 'close':
          actualButtons = [{id: 'close', title: 'Close', primary: true}];
          break;
        case 'cancel-ok':
          actualButtons = [{id: 'cancel', title: 'Cancel', primary: false}, {id: 'ok', title: 'Ok', primary: true}];
          break;
        case 'no-yes':
          actualButtons = [{id: 'no', title: 'No', primary: false}, {id: 'yes', title: 'Yes', primary: true}];
          break;
        default: throw new Error('Unknown buttons: ' + state.buttons);
      }
      return {actualButtons};
    }
    else{
      return {actualButtons: state.buttons};
    }

  }

  onDialogCreated(el: HTMLElement): void{
    this.dialogPopupElement = el;
    focusFirstDescendantOrSelf(el, true);
  }

  @HostListener('window:focusin', ['$event'])
  onFocusOut(e: FocusEvent): void{
    if (this.dialogPopupElement == null){
      return;
    }

    if (e.target != null && !this._popupService.getHostElement()?.contains(e.target as HTMLElement)){
      focusFirstDescendantOrSelf(this.dialogPopupElement, true);
    }
  }

  onButtonClick(id: string): void{
    this.buttonClick.emit(id);
  }
}
