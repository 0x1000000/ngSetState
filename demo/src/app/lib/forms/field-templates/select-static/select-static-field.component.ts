import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import { DynamicFieldTemplateFieldData } from '../../dynamic-field-template.directive';
import { SelectStaticFieldDescriptor } from '../../form-descriptor';

export type State = ComponentState<SelectStaticFieldComponent>;
export type NewState = ComponentStateDiff<SelectStaticFieldComponent>;

@Component({
  selector: 'select-static-field',
  templateUrl: './select-static-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectStaticFieldComponent {

  constructor(){
    initializeStateTracking(this, {immediateEvaluation: true });
  }

  @Input()
  fieldData: DynamicFieldTemplateFieldData | null = null;

  @Input()
  value: any;

  descriptor: SelectStaticFieldDescriptor | null = null;

  @With('value', 'descriptor')
  static setValueAnalysis(state: State): NewState {

    if (state.fieldData != null){
      if (state.value == null) {
        state.fieldData.setter.setValueAnalysis(true, null);
      }
      else{
        if ((state.descriptor?.multi ?? false) && Array.isArray(state.value) && state.value.length === 0){
          state.fieldData.setter.setValueAnalysis(true, null);
        }
        else{
          state.fieldData.setter.setValueAnalysis(false, null);
        }
      }
    }
    return null;
  }

  @With('fieldData')
  static calcDescriptor(s: State): NewState{
    if (s.fieldData != null){
      if (s.fieldData.descriptor.type === 'select-static'){
        return {descriptor: s.fieldData.descriptor};
      }
      return null;
    }
    throw new Error('\'select-static\' type is expected');
  }

  setSelected(value: any): void{
    if (value !== this.value)
    {
      this.fieldData?.setter.setValue(value);
    }
  }
}
