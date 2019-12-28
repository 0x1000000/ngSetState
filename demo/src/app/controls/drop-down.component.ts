import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, HostListener, ElementRef } from '@angular/core';
import { trigger, state, transition, animate, style } from '@angular/animations';
import { WithStateBase } from "ng-set-state";
import { DropDownState } from "./drop-down.state";

@Component({
    selector: 'drop-down',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./drop-down.component.html",
    inputs: DropDownState.ngInputs,
    outputs: DropDownState.ngOutputs,
    animations: [
        trigger("openClose", [
            state("open", style({ height: "*"})),
            state("close", style({ height: 0 })),
            transition("close => open", [animate("0.2s ease-in")])
        ]),
    ],
})
export class DropDownComponent extends WithStateBase<DropDownState> implements OnInit {
    public state: DropDownState;

    constructor(private _cd: ChangeDetectorRef, private _eRef:ElementRef) {
        super(new DropDownState(), DropDownState.ngInputs, DropDownState.ngOutputs);
        this._cd.detach();
    }

    public ngOnInit(): void {
        this._cd.detectChanges();
    }

    public onAfterStateApplied?(previousState?: DropDownState): void {
        this._cd.detectChanges();
    }

    @HostListener('window:click', ['$event', '$event.target'])
    @HostListener('window:mousedown', ['$event', '$event.target'])
    public onGlobalClick(event: MouseEvent, targetElement: HTMLElement): void {
        if (!targetElement) {
            return;
        }
        const clickedInside = this._eRef.nativeElement.contains(targetElement) || this._eRef.nativeElement === targetElement;


        if (!clickedInside && this.state.isOpen) {
            this.modifyState("isOpen", false);
        }
    }
}
