import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { initializeStateTracking } from 'ng-set-state';
import { DynamicFieldTemplateFieldData } from '../../dynamic-field-template.directive';

@Component({
  selector: 'bool-field',
  templateUrl: './bool-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoolFieldComponent {

  public items: {id: boolean, title: string}[] = [{id: true, title: 'Yes'}, {id: false, title: 'No'}];

  constructor(cd: ChangeDetectorRef){
    initializeStateTracking(this, {
      immediateEvaluation: true
    });
  }

  @Input()
  fieldData: DynamicFieldTemplateFieldData | null = null;

  @Input()
  value: any;

  setSelected(v?: boolean): void{
    this.fieldData?.setter.setValue(v);
    this.fieldData?.setter.setValueAnalysis(v == null, null);
  }
}
