import { Directive, Output, AfterViewInit, OnDestroy, EventEmitter } from '@angular/core';

@Directive({
    selector: 'life-cycle,[life-cycle]'
})
export class LifeCycleDirective implements AfterViewInit, OnDestroy {

    @Output()
    readonly onInit = new EventEmitter<void>();

    @Output()
    readonly onDestroy = new EventEmitter<void>();

    ngAfterViewInit(): void { this.onInit.emit(); }

    ngOnDestroy(): void { this.onDestroy.emit(); }
}
