import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import { DynamicFieldTemplateFieldData } from '../../dynamic-field-template.directive';
import { StringFieldDescriptor } from '../../form-descriptor';

export type State = ComponentState<TextFieldComponent>;
export type NewState = ComponentStateDiff<TextFieldComponent>;

@Component({
  selector: 'text-field',
  templateUrl: './text-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextFieldComponent {

  constructor() {
    initializeStateTracking(this, {immediateEvaluation: true });
  }

  @Input()
  fieldData: DynamicFieldTemplateFieldData | null = null;

  @Input()
  value: any;

  descriptor: StringFieldDescriptor | null = null;

  @With('value', 'descriptor')
  static setValueAnalysis(state: State): NewState {
    if (state.fieldData != null){
      if (state.value == null || state.value === ''){
        state.fieldData.setter.setValueAnalysis(true, null);
      }
      else if (typeof state.value !== 'string'){
        state.fieldData.setter.setValueAnalysis(false, 'Not String');
      }
      else{
        state.fieldData.setter.setValueAnalysis(false, null);
      }
    }

    return null;
  }

  @With('fieldData')
  static calcDescriptor(s: State): NewState{
    if (s.fieldData != null){
      if (s.fieldData.descriptor.type === 'text'){
        return {descriptor: s.fieldData.descriptor};
      }
      return null;
    }
    throw new Error('\'select-static\' type is expected');
  }

  getText(): void{
    let res = this.value;
    if (res === undefined){
      res = null;
    }
    return res;
  }

  getMaxLength(): number {
    if (this.descriptor?.maxLength == null){
      return 1000;
    }
    return this.descriptor.maxLength;
  }

  onTextChange(input: EventTarget | null): void {
    let str: string|null = (input as HTMLInputElement).value;

    if (str != null){
      str = str.trim();
      if (str === '' && (this.descriptor?.emptyToNull ?? false)){
        str = null;
      }
    }

    this.fieldData!.setter.setValue(str);
  }

  onBlur(): void{
    this.fieldData!.setter.setVisited();
  }
}
