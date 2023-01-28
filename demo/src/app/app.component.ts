import { Component } from '@angular/core';
import { Tab } from "./app.state";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
    public selectedTab: Tab = "intro";
}
