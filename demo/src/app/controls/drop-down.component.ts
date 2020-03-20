import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, HostBinding, HostListener, ElementRef, TemplateRef, ViewChild } from '@angular/core';
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
export class DropDownComponent extends WithStateBase<DropDownState> implements OnInit, OnChanges, OnDestroy, AfterViewInit {

    public state: DropDownState;

    public isDestroyed: boolean = false;

    constructor(private readonly _elementRef: ElementRef, private _cd: ChangeDetectorRef, private _eRef:ElementRef) {
        super(new DropDownState(), DropDownState.ngInputs, DropDownState.ngOutputs);
        this._cd.detach();
    }

    public ngOnInit(): void {
        if (!this.isDestroyed) {
            this._cd.detectChanges();
            this.modifyState("rootElement", this._elementRef.nativeElement);
        }
    }

    public ngAfterViewInit(): void {
        this.modifyState("itemTemplateDefault", this.itemTemplateDefault);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    public onAfterStateApplied?(previousState?: DropDownState): void {
        if (!this.isDestroyed) {
            this._cd.detectChanges();
        }
    }

    @ViewChild("itemTemplateDefault", { static: true })
    public itemTemplateDefault: TemplateRef<any>;

    @HostBinding('tabindex')
    public readonly tabindex = "0";

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

    @HostListener("focusin")
    public onFocus() {
        this.modifyState("focused", true);
    }

    @HostListener("focusout")
    public onBlur() {
        this.modifyState("focused", false);
    }

    @HostListener("keydown", ['$event'])
    public onKeyDown(e: KeyboardEvent) {
        if (e.keyCode === 13 /*Enter*/) {
            this.modifyStateDiff(this.state.onEnter());
        }

        if (e.keyCode === 27 /*Esc*/) {
            this.modifyStateDiff(this.state.onEsc());
        }

        if (e.keyCode === 40 /*Down*/) {
            this.modifyStateDiff(this.state.onDown());
        }
    }
}
