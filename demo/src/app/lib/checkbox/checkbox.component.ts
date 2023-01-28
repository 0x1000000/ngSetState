import { Component, ChangeDetectionStrategy, HostBinding, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { Calc, initializeStateTracking } from 'ng-set-state';

@Component({
    selector: 'checkbox',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './checkbox.component.html'
})
export class CheckboxComponent {

    constructor() {
        initializeStateTracking<CheckboxComponent>(this, { immediateEvaluation: true });
    }

    @Input()
    public checked = false;

    @Output()
    public checkedChange = new EventEmitter<boolean>();

    @Input()
    public round = false;

    @Input()
    @HostBinding('class.disabled')
    public disabled = false;

    @Calc(['checked', 'round'], s => s.checked && !s.round)
    public boxChecked = false;

    @Calc(['checked', 'round'], s => s.checked && s.round)
    public roundChecked = false;

    @HostBinding('tabindex')
    public readonly tabindex = '0';

    public toggle(): void {
        if (!this.disabled){
            this.checked = !this.checked;
        }
    }

    @HostListener('click')
    public onClick(): void {
        this.toggle();
    }

    @HostListener('keydown', ['$event'])
    public onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' /*Enter*/ || e.key === ' ' /*Space*/) {
            this.toggle();
        }
    }
}
