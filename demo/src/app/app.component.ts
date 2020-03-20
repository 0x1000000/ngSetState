import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { AppState } from "./app.state";
import { WithStateBase } from "ng-set-state";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent extends WithStateBase<AppState> implements OnChanges {
    constructor() {
        super(new AppState(), [], []);
    }

    public ngOnChanges(changes: SimpleChanges): void {
      super.ngOnChanges(changes);
    }
}
