import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef } from '@angular/core';
import { BindToShared, ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, releaseStateTracking, With } from 'ng-set-state';
import { areEqualArr } from '../../helpers';
import { DynamicFieldTemplateFieldData as DynamicFieldTemplateFieldData, DynamicFieldTemplateDirective, FieldSetter, DynamicFieldTemplateContext } from '../dynamic-field-template.directive';
import { FormField, TailButton } from '../form-descriptor';
import { FormFieldsState } from '../form-fields-state';

type State = ComponentState<DynamicFieldComponent>;
type NewState = ComponentStateDiff<DynamicFieldComponent>;

@Component({
  selector: 'dynamic-field',
  templateUrl: './dynamic-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicFieldComponent implements OnDestroy, OnInit, FormFieldsState {

  constructor(cd: ChangeDetectorRef, fieldsState: FormFieldsState) {
    const handler = initializeStateTracking<DynamicFieldComponent>(this, {
      onStateApplied: () => {if (this._isInit && !this._isDestroyed) { cd.detectChanges(); }},
      immediateEvaluation: false,
      sharedStateTracker: [fieldsState] }
    );

    handler.subscribeSharedStateChange();

    const c = this;
    this.valueSetter = {
      setValue(value: any): void{
        c.value = value;
      },
      setValueAnalysis(isEmpty: boolean, formatError: string|null): void{
        if (isEmpty !== c.isEmpty || formatError !== c.formatError){
          if (isEmpty !== c.isEmpty || formatError !== c.formatError){
            handler.modifyStateDiff({isEmpty, formatError});
          }
        }
      },
      setVisited(): void{
        setTimeout(() => {
          c.isVisited = true;
        });
      }
    };
  }

  private _isInit = false;

  private _isDestroyed = false;

  @Input()
  formField: FormField | null = null;

  @Input()
  templateDirectives: DynamicFieldTemplateDirective[] | null = null;

  @Input()
  initialFormObject: any = null;

  @Input()
  formObject: any = null;

  @Input()
  disabled = false;

  @Input()
  isVisited = false;

  @Output()
  readonly formObjectChange = new EventEmitter<any>();

  @Output()
  readonly tailButtonClick = new EventEmitter<any>();

  fieldTemplate: TemplateRef<DynamicFieldTemplateContext>| null = null;

  value: any;

  isEmpty = false;

  formatError: string | null = null;

  actualDisabled = false;

  isError = false;

  isVisibleError = false;

  isDirty = false;

  @BindToShared()
  errorCounter: number = 0;

  @BindToShared()
  dirtyCounter: number = 0;

  @Output()
  readonly isErrorChange = new EventEmitter<boolean>();

  fieldContext: DynamicFieldTemplateContext | null = null;

  fieldData: DynamicFieldTemplateFieldData | null = null;

  @IncludeInState()
  readonly valueSetter: FieldSetter;

  @With('formField', 'templateDirectives')
  static findTemplate(state: State): NewState{

    let fieldTemplate: TemplateRef<DynamicFieldTemplateContext>| null = null;

    if (state.formField && state.templateDirectives && state.templateDirectives.length > 0){
        const directiveIndex = state.templateDirectives
          .findIndex(td => td.typeId === state.formField!.descriptor.type || (state.formField!.descriptor.type === 'custom' && state.formField!.descriptor.subType === td.typeId));
        if (directiveIndex >= 0){
          fieldTemplate = state.templateDirectives[directiveIndex].templateRef;
        }
    }

    return { fieldTemplate };
  }

  @With('formField', 'formObject')
  static onFormObjectSet(state: State): NewState{
    let value: any;

    if (state.formObject && state.formField){
      value = state.formObject[state.formField.descriptor.id];
    }

    if (value === state.value){
      return null;
    }

    return { value };
  }

  @With('value')
  static createUpdatedObject(state: State): NewState{
    if (!state.formObject || !state.formField){
      return null;
    }

    const oldValue = state.formObject[state.formField.descriptor.id];
    if (oldValue === state.value){
      return null;
    }

    const formObject = Object.assign({}, state.formObject);
    formObject[state.formField.descriptor.id] = state.value;

    return { formObject };
  }

  @With('isEmpty', 'formField', 'formatError', 'formObject')
  static setError(state: State): NewState {
    let isError = false;
    if (state.formObject != null){
      if (state.formField != null && state.formField?.mandatory && state.isEmpty){
        isError = true;
      }

      if (state.formatError != null && state.formatError !== ''){
        isError = true;
      }
    }

    return {isError};
  }

  @With('isError', 'formatError', 'isVisited')
  static setVisibleError(state: State): NewState{
    return {
      isVisibleError: state.isError && (state.isVisited || (state.formatError != null && state.formatError !== ''))
    };
  }

  @With('formField', 'disabled')
  static calcActualDisabled(state: State): NewState {
    return {
      actualDisabled: state.disabled || state.formField?.disabled
    };
  }

  @With('formField', 'isError', 'actualDisabled', 'isVisited')
  static buildFormData(state: State): NewState {
    if (state.formField == null){
      return {
        fieldData: null
      };
    }

    return {
      fieldData: {
        isVisibleError: state.isVisibleError,
        disabled: state.actualDisabled,
        descriptor: state.formField.descriptor,
        setter: state.valueSetter
      }
    };
  }

  @With('fieldData', 'value')
  static buildFieldTemplateContext(state: State): NewState {
    if (state.fieldData == null){
      return {
        fieldContext: null
      };
    }
    return {
      fieldContext: {
        $implicit: state.value,
        fieldData: state.fieldData
      }
    };
  }

  @With('isError')
  static countErrors(state: State): NewState {
    if (state.isError){
      return {
        errorCounter: state.errorCounter + 1
      };
    }
    else{
      return {
        errorCounter: state.errorCounter - 1
      };
    }
  }

  @With('initialFormObject', 'formObject', 'formField')
  static calcIsDirty(state: State): NewState {
    if (state.initialFormObject == null || state.formField == null || state.formObject == null) {
      if (state.isDirty){
        return {isDirty: false};
      }
      return null;
    }

    const initial = state.initialFormObject[state.formField.descriptor.id];
    const current = state.formObject[state.formField.descriptor.id];

    const isDirty = !areEqualArr(initial, current);

    if (isDirty !== state.isDirty){
      return {isDirty};
    }
    return null;
  }

  @With('isDirty')
  static countDirty(state: State): NewState {
    if (state.isDirty){
      return {
        dirtyCounter: state.dirtyCounter + 1
      };
    }
    else{
      return {
        dirtyCounter: state.dirtyCounter - 1
      };
    }
  }

  ngOnInit(): void{
    this._isInit = true;
  }

  ngOnDestroy(): void {
    this._isDestroyed = true;
    if (this.isError){
      setTimeout(() => {
        this.errorCounter--;
        releaseStateTracking(this);
      });
    }
  }

  onTailButtonClick(tailButton: TailButton): void {
    this.tailButtonClick.emit(tailButton.clickArgument);
  }
}
