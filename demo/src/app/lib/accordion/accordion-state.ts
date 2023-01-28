import { initializeStateTracking } from 'ng-set-state';
import { AccordionPaneComponent } from './accordion-pane.component';

export class AccordionState {

  constructor() {
    initializeStateTracking<AccordionState>(this, { includeAllPredefinedFields: true });
  }

  selectedPane: AccordionPaneComponent|null = null;

  firstPane: AccordionPaneComponent|null = null;
}
