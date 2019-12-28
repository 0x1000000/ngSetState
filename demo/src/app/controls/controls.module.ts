import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioListComponent } from "./radio-list.component";
import { TabsComponent } from "./tabs.component";
import { TabPaneComponent } from "./tab-pane.component";
import { LifeCycleDirective } from "./life-cycle.directive";
import { DropDownComponent } from './drop-down.component';
import { SelectListComponent } from './select-list.component';

@NgModule({
    declarations: [
        RadioListComponent,
        TabsComponent,
        TabPaneComponent,
        LifeCycleDirective,
        DropDownComponent,
        SelectListComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        RadioListComponent,
        TabsComponent,
        TabPaneComponent,
        LifeCycleDirective,
        DropDownComponent,
        SelectListComponent
    ],
    providers: [],
})
export class ControlsModule {
}
