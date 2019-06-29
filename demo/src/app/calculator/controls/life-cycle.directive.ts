import { Directive, Output, AfterViewInit, OnDestroy, EventEmitter } from '@angular/core';

@Directive({
    selector: "life-cycle,[life-cycle]"
})
export class LifeCycleDirective implements AfterViewInit, OnDestroy {

    @Output()
    public readonly onInit = new EventEmitter<void>();

    @Output()
    public readonly onDestroy = new EventEmitter<void>();

    public ngAfterViewInit(): void { this.onInit.emit(); }

    public ngOnDestroy(): void { this.onDestroy.emit(); }
}
