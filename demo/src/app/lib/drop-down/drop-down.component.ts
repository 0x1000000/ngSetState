import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, HostBinding, HostListener, ElementRef, TemplateRef, ViewChild, Input, EventEmitter, Output } from '@angular/core';
import { ComponentState, ComponentStateDiff, initializeStateTracking, With } from 'ng-set-state';
import { focusFirstDescendantOrSelf } from '../helpers';
import {PopupService} from '../popup.service'

type State= ComponentState<DropDownComponent>;
type NewState= ComponentStateDiff<DropDownComponent>;

@Component({
    selector: 'drop-down',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './drop-down.component.html'
})
export class DropDownComponent implements OnInit, OnDestroy {

    constructor(elementRef: ElementRef, private readonly _cd: ChangeDetectorRef, public readonly popupService: PopupService) {
        this.rootElement = elementRef.nativeElement;
        initializeStateTracking<DropDownComponent>(this, {
            onStateApplied: (() => {
                if (this.isInit){
                    this._cd.detectChanges();
                }
                }),
            includeAllPredefinedFields: true,
            immediateEvaluation: true });
    }

    isInit = false;

    isDestroyed = false;

    @Input()
    maxDropHeightPx = 300;

    @Input()
    openDisabled = false;

    @Input()
    isOpen = false;

    @Output()
    readonly isOpenChange = new EventEmitter<boolean>();

    @Input()
    inputTemplate: TemplateRef<any>|null = null;

    @Input()
    dropContentTemplate: TemplateRef<any>|null = null;

    @Input()
    disabled = false;

    @Input()
    isError = false;

    actualMaxDropHeightPx = 300;
    @Output()
    readonly actualMaxDropHeightPxChange = new EventEmitter<number>();

    focused = false;

    isUpDirection = false;

    popupElement: HTMLElement|null = null;

    popupRect: {left: number, top: number|undefined, bottom: number|undefined, width: number, inOverlay: boolean}
        = {left: 0, top: undefined, bottom: undefined, width: 0, inOverlay: false};

    readonly rootElement: HTMLElement;

    @HostBinding('tabindex')
    readonly tabindex = '0';

    @With('isOpen')
    static onOpen(state: State): NewState {
        if (state.isOpen){

            let isUpDirection = false;
            let actualMaxDropHeightPx = state.maxDropHeightPx;
            
            const inOverlay = state.popupService.getHostElement()?.contains(state.rootElement) ?? false;

            const rect = state.rootElement.getBoundingClientRect();            

            const upSpace = rect.y;
            const downSpace = window.innerHeight - rect.y - rect.height;

            if (downSpace < actualMaxDropHeightPx){
                if (upSpace >= actualMaxDropHeightPx){
                  isUpDirection = true;
                }
                else{
                    if (upSpace > downSpace){
                        isUpDirection = true;
                        actualMaxDropHeightPx = upSpace;
                    }
                    else{
                        actualMaxDropHeightPx = downSpace;
                    }
                }
            }

            return {
                actualMaxDropHeightPx,
                isUpDirection,
                popupRect: isUpDirection
                    ? {left: rect.x, top: undefined, bottom: downSpace, width: rect.width, inOverlay}
                    : {left: rect.x, top: rect.y, bottom: undefined, width: rect.width, inOverlay}
            };
        }
        return null;
    }

    @With('popupElement')
    static onDropDownPaneCreatedDestroyed(currentState: State): NewState {
        let focused = false;
        if (currentState.popupElement) {
            focusFirstDescendantOrSelf(currentState.popupElement!, true);
            focused = true;
        } else if (currentState.rootElement != null) {
            focusFirstDescendantOrSelf(currentState.rootElement!, true);
            focused = true;
        }

        if (focused) {
            return { focused: true };
        }
        return null;
    }

    ngOnInit(): void {
        if (!this.isDestroyed) {
            this.isInit = true;
        }
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    @HostListener('window:click', ['$event.target'])
    @HostListener('window:mousedown', ['$event.target'])
    @HostListener('window:mousewheel', ['$event.target'])
    onGlobalClick(targetElement: HTMLElement): void {
        if (!targetElement) {
            return;
        }
        if (this.popupElement != null){
            let clickedInside = this.popupElement.contains(targetElement) || this.popupElement === targetElement;
            if (!clickedInside && this.isOpen) {
                if (this.rootElement === targetElement || this.rootElement.contains(targetElement)){
                    clickedInside = true;
                }
            }
            if (!clickedInside && this.isOpen) {
                this.isOpen = false;
            }
        }
    }

    @HostListener('focusin')
    onFocus(): void {
        this.focused = true;
        this._cd.detectChanges();
    }

    @HostListener('focusout')
    onBlur(): void {
        setTimeout(() => {
            const inside =
                this.rootElement === document.activeElement
                ||
                (
                    this.popupElement != null
                    &&
                    (
                        this.popupElement.contains(document.activeElement)
                        ||
                        this.popupElement === document.activeElement
                    )
                );

            if (this.focused && !inside){
                this.focused = false;
            }
        });
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(e: KeyboardEvent): void {

        let stopPropagation = false;
        if (e.key === 'Enter') {
            this.onEnter();
            stopPropagation = true;
        }

        if (e.key === 'Escape') {
            this.onEsc();
            stopPropagation = true;
        }

        if (e.key === 'ArrowDown') {
            this.onDown();
            stopPropagation = true;
        }

        if (e.key === 'ArrowUp') {
            stopPropagation = true;
        }

        if (stopPropagation){
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    toggle(): void {
        if (this.openDisabled) {
            this.isOpen = false;
        }
        else{
            this.isOpen = !this.isOpen;
        }
    }

    onEsc(): void {
        if (this.isOpen) {
            this.toggle();
        }
    }

    onEnter(): void {
        if (!this.isOpen) {
            this.toggle();
        }
    }

    onDown(): void {
        this.onEnter();
    }
}
