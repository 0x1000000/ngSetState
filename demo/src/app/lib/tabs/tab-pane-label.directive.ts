import { Directive, Host, TemplateRef } from '@angular/core';
import { TabPaneComponent } from './tab-pane.component';

export type TabPaneLabelContext = {
  readonly label: string | null | undefined,
  readonly id: any
};

@Directive({
  selector: '[sqTabPaneLabel]'
})
export class TabPaneLabelDirective {
  constructor(@Host() host: TabPaneComponent,  templateRef: TemplateRef<TabPaneLabelContext>) {
    host.labelTemplate = templateRef;
  }
}
