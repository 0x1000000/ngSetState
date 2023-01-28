import { initializeStateTracking } from 'ng-set-state';
import { TabPaneComponent } from './tab-pane.component';

export class TabsState{

  constructor() {
    initializeStateTracking<TabsState>(this, { includeAllPredefinedFields: true });
  }

  selectedPane: TabPaneComponent|null = null;

  previewPane: TabPaneComponent|null = null;

  inkPosition: [number, number]|null = null;
}
