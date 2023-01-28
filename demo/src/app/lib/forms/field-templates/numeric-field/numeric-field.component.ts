import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import { DynamicFieldTemplateFieldData } from '../../dynamic-field-template.directive';
import { NumericFieldDescriptor } from '../../form-descriptor';

export type State = ComponentState<NumericFieldComponent>;
export type NewState = ComponentStateDiff<NumericFieldComponent>;

@Component({
  selector: 'numeric-field',
  templateUrl: './numeric-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NumericFieldComponent {

  constructor() {
    initializeStateTracking(this, {immediateEvaluation: true });
  }

  @Input()
  fieldData: DynamicFieldTemplateFieldData|null = null;

  @Input()
  value: any;

  descriptor: NumericFieldDescriptor | null = null;

  regExp: RegExp|null = null;

  @With('value', 'descriptor')
  static setValueAnalysis(state: State): NewState {
    if (state.fieldData != null){

      if (state.value == null || state.value === ''){
        state.fieldData.setter.setValueAnalysis(true, null);
      }
      else if (typeof state.value !== 'number'){
        state.fieldData.setter.setValueAnalysis(false, 'Not Number');
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
      if (s.fieldData.descriptor.type === 'numeric'){

        const descriptor = s.fieldData.descriptor;


        const regExp = descriptor.min != null && descriptor.min < 0
          ? /^-\d+$/
          :  /^\d+$/;

        return {
          descriptor,
          regExp
        };
      }
      return null;
    }
    throw new Error('\'select-static\' type is expected');
  }

  getText(): string|null{
    const res = this.value;
    if (res == null){
      return null;
    }
    return res.toString();
  }

  onTextChange(input: EventTarget | null): void {
    const str: string = (input as HTMLInputElement).value;

    if (str == null || str === ''){
      this.fieldData!.setter.setValue(null);
      return;
    }

    if (!this.regExp!.test(str)){
      this.fieldData!.setter.setValueAnalysis(false, 'Invalid format');
      return;
    }

    const int = Number.parseInt(str);
    if (Number.isNaN(int)){
      this.fieldData!.setter.setValueAnalysis(false, 'Invalid numeric format');
      return;
    }
    this.fieldData!.setter.setValueAnalysis(false, null);
    this.fieldData!.setter.setValue(int);
  }

  onBlur(): void{
    this.fieldData!.setter.setVisited();
  }
}
