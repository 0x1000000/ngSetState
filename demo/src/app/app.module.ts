import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { CalculatorDemoComponent } from "./calculator/calculator-demo.component";
import { CalculatorComponent } from "./calculator/calculator.component";
import { StateStorageService } from "./StateStorageService";
import { DropDownDemoComponent } from "./controlsDemo/drop-down-demo.component";
import { LibModule } from './lib/lib.module';

@NgModule({
    declarations: [
        AppComponent,
        CalculatorComponent,
        CalculatorDemoComponent,
        DropDownDemoComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        LibModule,
        BrowserAnimationsModule
    ],
    providers: [StateStorageService],
    bootstrap: [AppComponent]
})
export class AppModule {
}
