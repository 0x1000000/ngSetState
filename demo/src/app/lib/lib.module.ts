import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TabsComponent } from './tabs/tabs.component';
import { TabPaneComponent } from './tabs/tab-pane.component';
import { TabLabelComponent } from './tabs/tab-label.component';
import { AccordionComponent } from './accordion/accordion.component';
import { AccordionPaneComponent } from './accordion/accordion-pane.component';
import { AccordionPaneContentDirective, AccordionPaneLabelDirective } from './accordion/accordion-pane-placeholders.directive';
import { TabsLeftAreaDirective, TabsRightAreaDirective } from './tabs/tabs-placeholders';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { LifeCycleDirective } from './life-cycle.directive';
import { SelectListComponent } from './select-list/select-list.component';
import { DropDownComponent } from './drop-down/drop-down.component';
import { PopupService } from './popup.service';
import { PopupHostComponent } from './popup-host/popup-host.component';
import { PopupRectDirective } from './popup-rect/pop-rect.directive';
import { TabPaneLabelDirective } from './tabs/tab-pane-label.directive';
import { DynamicFormComponent } from './forms/dynamic-form/dynamic-form.component';
import { DynamicFieldComponent } from './forms/dynamic-field/dynamic-field.component';
import { DynamicFieldTemplateDirective } from './forms/dynamic-field-template.directive';
import { TextFieldComponent } from './forms/field-templates/text-field/text-field.component';
import { SelectStaticFieldComponent } from './forms/field-templates/select-static/select-static-field.component';
import { ModalDialogComponent } from './modal-dialog/modal-dialog.component';
import { NumericFieldComponent } from './forms/field-templates/numeric-field/numeric-field.component';
import { MultiSelectListComponent } from './multi-select-list/multi-select-list.component';
import { DropDownListComponent } from './drop-down-list/drop-down-list.component';
import { BoolFieldComponent } from './forms/field-templates/bool-field/bool-field.component';
import { RadioListComponent } from './radio-list/radio-list.component';

@NgModule({
  imports:      [ BrowserModule ],
  declarations: [
    LifeCycleDirective,
    TabsComponent, TabPaneComponent, TabLabelComponent, TabsLeftAreaDirective, TabsRightAreaDirective, TabPaneLabelDirective,
    AccordionComponent, AccordionPaneComponent, AccordionPaneLabelDirective, AccordionPaneContentDirective,
    CheckboxComponent,
    SelectListComponent,
    MultiSelectListComponent,
    DropDownComponent,
    DropDownListComponent,
    PopupHostComponent,
    PopupRectDirective,
    DynamicFormComponent, DynamicFieldComponent, DynamicFieldTemplateDirective,
    TextFieldComponent, NumericFieldComponent, SelectStaticFieldComponent,BoolFieldComponent,
    ModalDialogComponent,
    RadioListComponent
   ],
  exports: [
    LifeCycleDirective,
    TabsComponent, TabPaneComponent, TabsLeftAreaDirective, TabsRightAreaDirective, TabPaneLabelDirective,
    AccordionComponent, AccordionPaneComponent, AccordionPaneLabelDirective, AccordionPaneContentDirective,
    CheckboxComponent,
    SelectListComponent,
    MultiSelectListComponent,
    DropDownComponent,
    DropDownListComponent,
    PopupHostComponent,
    PopupRectDirective,
    DynamicFormComponent, DynamicFieldComponent, DynamicFieldTemplateDirective,
    ModalDialogComponent,
    RadioListComponent
  ],
  providers: [
    PopupService
  ],
  bootstrap: [
    PopupHostComponent
  ]
})
export class LibModule {
  constructor(_: PopupService/*Create an instance of the service on startup*/){
  }
}
