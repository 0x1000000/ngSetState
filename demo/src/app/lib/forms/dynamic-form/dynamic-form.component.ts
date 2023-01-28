import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  ContentChildren,
  AfterContentInit,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy
} from '@angular/core';
import { BindToShared, ComponentState, ComponentStateDiff, IncludeInState, initializeStateTracking, releaseStateTracking, With } from 'ng-set-state';
import { DynamicFieldTemplateDirective } from '../dynamic-field-template.directive';
import { FormField } from '../form-descriptor';
import { FormFieldsState } from '../form-fields-state';

type State = ComponentState<DynamicFormComponent>;
type NewState = ComponentStateDiff<DynamicFormComponent>;

@Component({
  selector: 'dynamic-form',
  templateUrl: './dynamic-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FormFieldsState]
})
export class DynamicFormComponent implements AfterContentInit, AfterViewInit, OnDestroy, FormFieldsState {

  constructor(cd: ChangeDetectorRef, fieldsState: FormFieldsState) {
    initializeStateTracking<DynamicFormComponent>(this, {
      onStateApplied: () => cd.detectChanges(),
      immediateEvaluation: true,
      sharedStateTracker: [fieldsState]})

      .subscribeSharedStateChange();
  }

  @Input()
  fields: FormField[] = [];

  @Input()
  initialFormObject: any = undefined;

  @Input()
  formObject: any = null;

  @Output()
  readonly formObjectChange = new EventEmitter<any>();

  @Input()
  disabled = false;

  @Input()
  isVisited = false;

  // onErrorCounter
  isError = false;

  @Output()
  readonly isErrorChange = new EventEmitter<boolean>();

  // onDirtyCounter
  isDirty = false;

  isMultiCol = false;

  @Output()
  readonly isDirtyChange = new EventEmitter<boolean>();

  @Output()
  readonly tailButtonClick = new EventEmitter<any>();

  @BindToShared()
  errorCounter: number = 0;

  @BindToShared()
  dirtyCounter: number = 0;

  // calcActualDisabled
  actualDisabled = false;

  // ngAfterContentInit
  contentTemplates: DynamicFieldTemplateDirective[] | null = null;

  // ngAfterViewInit
  viewTemplates: DynamicFieldTemplateDirective[] | null = null;

  // selectActualTemplates
  templates: DynamicFieldTemplateDirective[] | null = null;

  @ContentChildren(DynamicFieldTemplateDirective)
  contentTemplatesQuery: QueryList<DynamicFieldTemplateDirective>|undefined;

  @ViewChildren(DynamicFieldTemplateDirective)
  viewTemplatesQuery: QueryList<DynamicFieldTemplateDirective>|undefined;

  @With('contentTemplates', 'viewTemplates')
  static selectActualTemplates(state: State): NewState{

    let templates: DynamicFieldTemplateDirective[]| null;
    if (!state.viewTemplates){
      templates = state.contentTemplates;
    }
    else if (!state.contentTemplates){
      templates = state.viewTemplates;
    }
    else{
      templates = [...state.viewTemplates];

      for (const t of state.contentTemplates) {
        const existingIndex = templates.findIndex(et => et.typeId === t.typeId);
        if (existingIndex >= 0){
          templates[existingIndex] = t;
        }
        else{
          templates.push(t);
        }
      }
    }

    return {
      templates
    };
  }

  @With('disabled', 'formObject')
  static calcActualDisabled(state: State): NewState{

    return {
      actualDisabled: state.disabled || state.formObject == null
    };
  }

  @With('errorCounter', 'formObject')
  static onErrorCounterSetIsError(state: State): NewState{
    return {
      isError: state.errorCounter > 0 && state.formObject != null
    };
  }

  @With('dirtyCounter', 'formObject')
  static onDirtyCounterSetIsError(state: State): NewState{
    return {
      isDirty: state.dirtyCounter > 0 && state.formObject != null
    };
  }

  @With('fields')
  static calcMultiColumn(s: State): NewState{
    return {
      isMultiCol: s.fields != null && s.fields.length > 8
    };
  }

  ngAfterContentInit(): void {
    this.contentTemplates = this.contentTemplatesQuery!.toArray();
    this.contentTemplatesQuery!.changes.subscribe(() => {
      this.contentTemplates = this.contentTemplatesQuery!.toArray();
    });
  }

  ngAfterViewInit(): void {
    this.viewTemplates = this.viewTemplatesQuery!.toArray();
    this.viewTemplatesQuery!.changes.subscribe(() => {
      this.viewTemplates = this.viewTemplatesQuery!.toArray();
    });
  }

  ngOnDestroy(): void {
    releaseStateTracking(this);
  }

}
