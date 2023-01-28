import { initializeStateTracking } from 'ng-set-state';

export class FormFieldsState {
  constructor( ){
    initializeStateTracking(this, {
      immediateEvaluation: true,
      includeAllPredefinedFields: true
    });
  }

  errorCounter = 0;

  dirtyCounter = 0;
}
