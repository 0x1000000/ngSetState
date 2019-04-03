import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { RadioListComponent } from "./controls/radio-list.component";
import { CalculatorDemoComponent } from "./components/calculator-demo.component";
import { CalculatorComponent } from "./components/calculator.component";

@NgModule({
    declarations: [
        AppComponent,
        RadioListComponent,
        CalculatorComponent,
        CalculatorDemoComponent
    ],
    imports: [
        BrowserModule,
        FormsModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
