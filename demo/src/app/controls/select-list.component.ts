import { Component, ChangeDetectionStrategy, ElementRef, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef, HostBinding, HostListener, ViewChild, TemplateRef } from '@angular/core';
import { WithStateBase } from "ng-set-state";
import { SelectListState, ViewItem, ItemTemplateContext } from './select-list.state';

@Component({
    selector: 'select-list',
    templateUrl: "./select-list.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    inputs: SelectListState.ngInputs,
    outputs: SelectListState.ngOutputs
})
export class SelectListComponent extends WithStateBase<SelectListState> implements OnInit, OnChanges, OnDestroy {

    public state: SelectListState;

    private _isDestroyed: boolean = false;

    constructor(private readonly _elementRef: ElementRef, private readonly _cd: ChangeDetectorRef) {
        super(new SelectListState(), SelectListState.ngInputs, SelectListState.ngOutputs);
    }

    @ViewChild("itemTemplateDefault", { static: true })
    public itemTemplateDefault: TemplateRef<ItemTemplateContext>;

    public ngOnInit(): void {
        this._cd.detach();
        this.modifyState("rootElement", this._elementRef.nativeElement);
    }

    public ngAfterViewInit(): void {
        this.modifyState("itemTemplateDefault", this.itemTemplateDefault);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        super.ngOnChanges(changes);
    }

    public ngOnDestroy(): void {
        this._isDestroyed = true;
    }

    public onAfterStateApplied?(previousState?: SelectListState): void {
        if (!this._isDestroyed) {
            this._cd.detectChanges();
        }
    }

    public onItemInit(viewItem: ViewItem, element: HTMLElement) {
        this.modifyStateDiff(this.state.onItemInit(viewItem, element));
    }

    public onItemMouseEnter(viewItem: ViewItem) {
        this.modifyStateDiff(this.state.onItemMouseEnter(viewItem));
    }

    public onItemMouseMove(viewItem: ViewItem) {
        if (!this.state.mouseMoved || this.state.focusedItem !== viewItem) {
            this.modifyStateDiff(this.state.onItemMouseMove(viewItem));
        }
    }

    public onItemClick(viewItem: ViewItem) {
        this.modifyStateDiff(this.state.onItemSelect(viewItem));
    }

    @HostBinding('tabindex')
    public readonly tabindex = "0";

    @HostListener("keypress", ['$event'])
    public onKeyPress(e: KeyboardEvent) {
        this.modifyStateDiff(this.state.onLetter(String.fromCharCode(e.keyCode).toLowerCase()));
    }

    @HostListener("keydown", ['$event'])
    public onKeyDown(e: KeyboardEvent) {
        let stopPropogation = false;

        if (e.keyCode === 13 /*Enter*/) {
            this.modifyStateDiff(this.state.onEnter());
            stopPropogation = true;
        }

        if (e.keyCode === 38 /*Up*/) {
            this.modifyStateDiff(this.state.onUp());
            stopPropogation = true;
        }


        if (e.keyCode === 40 /*Down*/) {
            this.modifyStateDiff(this.state.onDown());
            stopPropogation = true;
        }

        if (stopPropogation) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }
}
