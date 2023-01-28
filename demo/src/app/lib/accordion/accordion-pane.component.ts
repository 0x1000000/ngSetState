import { Input, ChangeDetectorRef } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { BindToShared, Calc, ComponentState, ComponentStateDiff, initializeStateTracking, releaseStateTracking, With } from 'ng-set-state';
import { AccordionState } from './accordion-state';

type State = ComponentState<AccordionPaneComponent>;
type NewState = ComponentStateDiff<AccordionPaneComponent>;

@Component({
  selector: 'accordion-pane',
  templateUrl: './accordion-pane.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('openClose', [
        state('open', style({ height: '*'})),
        state('close', style({ height: 0 })),
        transition('close => open', [animate('0.2s ease-in')]),
        transition('open => close', [animate('0.2s ease-in')]),
    ]),
  ],
})
export class AccordionPaneComponent implements OnDestroy {

  constructor(accordionState: AccordionState, cd: ChangeDetectorRef) {
    this.thisPane = this;
    initializeStateTracking(this, {sharedStateTracker: accordionState, onStateApplied: () => cd.detectChanges()})
      .subscribeSharedStateChange();
  }

  @BindToShared()
  selectedPane: AccordionPaneComponent|null = null;

  @BindToShared()
  firstPane: AccordionPaneComponent|null = null;

  @Input()
  label: string | null = null;

  @Input()
  id: any = null;

  readonly thisPane: AccordionPaneComponent;

  @Calc(['selectedPane', 'thisPane'], s => s.thisPane === s.selectedPane)
  isSelected = false;

  @Calc(['firstPane', 'thisPane'], s => s.thisPane === s.firstPane)
  isFirst = false;

  isHidden = false;

  animationState: 'open'|'close' = 'close';

  @With('isSelected')
  static onSelected(s: State): NewState{
   return{
     animationState: s.isSelected ? 'open' : 'close',
     isHidden: s.isSelected ? false : s.isHidden
   };
  }

  ngOnDestroy(): void {
    releaseStateTracking(this);
  }

  onTabClick(): void {
    this.selectedPane = this;
  }

  onAnimationDone(): void {
    this.isHidden = !this.isSelected;
  }
}
