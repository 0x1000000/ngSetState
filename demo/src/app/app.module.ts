import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { CalculatorDemoComponent } from "./calculator/calculator-demo.component";
import { CalculatorComponent } from "./calculator/calculator.component";
import { TodoListComponent } from "./todoList/todoList.component";
import { TodoItemComponent } from "./todoList/todoItem.component";
import { TodoNewItemComponent } from "./todoList/todoNewItem.component";
import { ControlsModule } from "./controls/controls.module";
import { StateStorageService } from "./StateStorageService";
import { TodoService } from "./todoList/TodoService";
import { DropDownDemoComponent } from "./controlsDemo/drop-down-demo.component";
import { CheckboxComponent } from "./controls/checkbox.component";

@NgModule({
    declarations: [
        AppComponent,
        CalculatorComponent,
        CalculatorDemoComponent,
        TodoListComponent,
        TodoItemComponent,
        TodoNewItemComponent,
        DropDownDemoComponent,
        CheckboxComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        ControlsModule,
        BrowserAnimationsModule
    ],
    providers: [StateStorageService, TodoService],
    bootstrap: [AppComponent]
})
export class AppModule {
}
