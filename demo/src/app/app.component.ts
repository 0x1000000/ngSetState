import { Component } from '@angular/core';
import { AppState } from "./app.state";
import { WithStateBase } from "ng-set-state/dist/ngSetState";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent extends WithStateBase<AppState> {
    constructor() {
        super(new AppState(), [], []);
    }
}
