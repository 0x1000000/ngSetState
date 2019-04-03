import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

    public items = [
        { id: "1", text: "Item 1", textAlt: "Item 1 (alt)" },
        { id: "2", text: "Item 2", textAlt: "Item 2 (alt)" },
        { id: "3", text: "Item 3", textAlt: "Item 3 (alt)" }
    ];


    public titleProperty = "text";

    public selected = "1";

    public selectedItem: any;
}
