import { Directive, Input, OnInit, TemplateRef } from '@angular/core';
import { FieldDescriptor } from './form-descriptor';

@Directive({
  selector: '[sqDynamicFieldTemplate]'
})
export class DynamicFieldTemplateDirective implements OnInit {

  @Input('sqDynamicFieldTemplate')
  typeId = '';

  constructor(readonly templateRef: TemplateRef<DynamicFieldTemplateContext>) { }

  ngOnInit(): void {
    if (this.typeId == null || this.typeId === ''){
      throw new Error('\'sqDynamicFieldTemplate\' directive should have a value (field type)');
    }
  }
}

export type DynamicFieldTemplateContext = {
  readonly $implicit: any,
  readonly fieldData: DynamicFieldTemplateFieldData
};

export type DynamicFieldTemplateFieldData = {
  readonly descriptor: FieldDescriptor;
  readonly isVisibleError: boolean;
  readonly disabled: boolean;
  readonly setter: FieldSetter;
};

export type FieldSetter = {
  setValue(value: any): void,
  setValueAnalysis(isEmpty: boolean, formatError: string|null): void,
  setVisited(): void
};
