import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioListComponent } from "./radio-list.component";
import { TabsComponent } from "./tabs.component";
import { TabPaneComponent } from "./tab-pane.component";
import { LifeCycleDirective } from "./life-cycle.directive";

@NgModule({
    declarations: [
        RadioListComponent,
        TabsComponent,
        TabPaneComponent,
        LifeCycleDirective
    ],
    imports: [
        CommonModule
    ],
    exports: [
        RadioListComponent,
        TabsComponent,
        TabPaneComponent,
        LifeCycleDirective
    ],
    providers: [],
})
export class ControlsModule {
}
