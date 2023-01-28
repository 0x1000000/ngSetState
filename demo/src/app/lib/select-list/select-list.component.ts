import {
    Component,
    ChangeDetectionStrategy,
    ElementRef,
    OnInit,
    ChangeDetectorRef,
    HostBinding,
    HostListener,
    ViewChild,
    TemplateRef,
    Input,
    EventEmitter,
    Output
} from '@angular/core';
import { Calc, ComponentState, ComponentStateDiff, Emitter,  initializeStateTracking, With } from 'ng-set-state';
import { extractMandatoryMember, scrollIntoViewIfNeeded } from '../helpers';

export type ViewItem = {
    model: any,
    id: any,
    text: string,
    focused: boolean,
    selected: boolean,
    element?: HTMLElement,
    templateContext: object };

export type State = ComponentState<SelectListComponent>;
export type NewState = ComponentStateDiff<SelectListComponent>;

export type ItemTemplateContext = { $implicit: object, text: string };


@Component({
    selector: 'select-list',
    templateUrl: './select-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectListComponent implements OnInit {

    constructor(elementRef: ElementRef, private readonly _cd: ChangeDetectorRef) {
        initializeStateTracking(this, {includeAllPredefinedFields: true, onStateApplied: () => this._cd.detectChanges()});
        this.rootElement = elementRef.nativeElement;
    }

    private static readonly noneModel = {};

    @Input()
    items: any[] | null = null;

    @Input()
    idMember: string | null = null;

    @Input()
    textMember: string | null = null;

    @Input('itemTemplate')
    itemTemplateIn: TemplateRef<ItemTemplateContext> | null = null;

    @ViewChild('itemTemplateDefault', { static: true })
    itemTemplateDefault: TemplateRef<ItemTemplateContext> | null = null;

    @Calc(['itemTemplateIn', 'itemTemplateDefault'], s => s.itemTemplateIn == null ? s.itemTemplateDefault : s.itemTemplateIn)
    itemTemplate: TemplateRef<{ $implicit: object }> | null = null;

    @Input()
    selected: any = null;

    @Input()
    noneText: any = '(none)';

    @Input()
    showNullSelection = false;

    @Output()
    selectedChange = new EventEmitter<object | null>();

    @Emitter()
    close: any;

    @Output('close')
    closeChange = new EventEmitter<any>();

    viewItems: ViewItem[] = [];

    rootElement: HTMLElement;

    focusedItem: ViewItem | null = null;

    selectedViewItem: ViewItem | null = null;

    mouseMoved = false;

    selectedItem: any = null;

    @Output()
    selectedItemChange = new EventEmitter<any>();

    @HostBinding('tabindex')
    tabindex = '0';

    @With('selectedViewItem')
    public static withSelectedViewItem(currentState: State): NewState {
        if (currentState.selectedViewItem == null || currentState.selectedViewItem.model === SelectListComponent.noneModel) {
            return {
                selected: null,
                selectedItem: null
            };
        } else {
            return {
                selected: extractMandatoryMember(currentState.selectedViewItem.model, currentState.idMember),
                selectedItem: currentState.selectedViewItem.model,
                focusedItem: currentState.selectedViewItem
            };
        }
    }

    @With('focusedItem')
    public static onFocusedItem(currentState: State, previousState: State): NewState {
        if (previousState.focusedItem != null && previousState.focusedItem.focused) {
            previousState.focusedItem.focused = false;
        }
        if (currentState.focusedItem != null && !currentState.focusedItem.focused) {
            currentState.focusedItem.focused = true;
        }
        return { mouseMoved: false };
    }

    @With('items', 'idMember', 'textMember', 'noneText')
    public static buildItems(currentState: State): NewState {

        if (currentState.items == null || currentState.items.length < 1) {
            return {viewItems: []};
        }

        const viewItems: ViewItem[] = currentState.items.map(i => ({
            model: i,
            id: extractMandatoryMember(i, currentState.idMember),
            text: extractMandatoryMember(i, currentState.textMember).toString(),
            focused: false,
            selected: SelectListComponent.checkModelIsSelected(currentState, i),
            templateContext: {
                $implicit: i,
                text: extractMandatoryMember(i, currentState.textMember).toString(),
                selected: SelectListComponent.checkModelIsSelected(currentState, i)}
        }));

        if (currentState.showNullSelection){
            viewItems.unshift({
                model: SelectListComponent.noneModel,
                id: null,
                text: currentState.noneText,
                focused: false,
                selected: SelectListComponent.checkModelIsSelected(currentState, SelectListComponent.noneModel),
                templateContext: { $implicit: null, text: currentState.noneText }
            });
        }

        return { viewItems };
    }

    @With('viewItems', 'selected')
    public static syncSelectedItem(currentState: State): NewState {

        let newSelectedItem: ViewItem | null = null;

        for (const viewItem of currentState.viewItems) {
            viewItem.selected = SelectListComponent.checkModelIsSelected(currentState, viewItem.model);
            if (viewItem.selected) {
                if (newSelectedItem != null) {
                    throw new Error('selected item id is not unique');
                }
                newSelectedItem = viewItem;
            }
        }
        return { selectedViewItem: newSelectedItem };
    }

    private static checkModelIsSelected(state: State, model: object): boolean {
        if (state.selected == null) {
            return model === SelectListComponent.noneModel;
        }
        if (model === SelectListComponent.noneModel){
            return false;
        }
        return extractMandatoryMember(model, state.idMember) === state.selected;
    }

    public ngOnInit(): void {
        this._cd.detach();
    }

    public onItemClick(viewItem: ViewItem): void {
        this.onItemSelect(viewItem);
    }

    public isNoneModel(model: any): boolean {
        return model === SelectListComponent.noneModel;
    }

    @HostListener('keypress', ['$event'])
    public onKeyPress(e: KeyboardEvent): void {
        // tslint:disable-next-line: deprecation
        this.onLetter(String.fromCharCode(e.keyCode).toLowerCase());
    }

    @HostListener('keydown', ['$event'])
    public onKeyDown(e: KeyboardEvent): void {
        let stopPropagation = false;

        if (e.key === 'Enter' /*Enter*/) {
            this.onEnter();
            stopPropagation = true;
        }

        if (e.key === 'ArrowUp' /*Up*/) {
            this.onUp();
            stopPropagation = true;
        }


        if (e.key === 'ArrowDown' /*Down*/) {
            this.onDown();
            stopPropagation = true;
        }

        if (stopPropagation) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    public onItemInit(viewItem: ViewItem, element: HTMLElement): void{
        viewItem.element = element;
        if (viewItem.selected) {
            scrollIntoViewIfNeeded(element);
        }
    }

    public onItemMouseEnter(viewItem: ViewItem): void{
        if (!this.mouseMoved) {
            return;
        }
        this.focusedItem = viewItem;
    }

    public onItemMouseMove(viewItem: ViewItem): void{
        if (this.mouseMoved || this.focusedItem === viewItem) {
            return;
        }
        this.focusedItem = viewItem;
        this.mouseMoved = true;
    }

    public onItemSelect(viewItem: ViewItem): void{
        if (this.selectedViewItem != null) {
            this.selectedViewItem.selected = false;
        }
        viewItem.selected = true;
        this.selectedViewItem = viewItem;
    }

    public onUp(): void {

        let nextIndex: number | null = null;
        if (this.focusedItem == null) {
            if (this.viewItems.length > 0) {
                nextIndex = 0;
            }
        } else {
            const currentIndex = this.viewItems.indexOf(this.focusedItem);
            if (currentIndex < 0) {
                throw new Error('Could not find selected item');
            }
            if (currentIndex > 0) {
                nextIndex = currentIndex - 1;
            } else {
                this.close = null;
                return;
            }
        }

        if (nextIndex != null) {
            const newFocusedItem = this.viewItems[nextIndex];
            if (newFocusedItem.element) {
                scrollIntoViewIfNeeded(newFocusedItem.element);
            }
            this.focusedItem = newFocusedItem;
            return;
        }
    }

    public onDown(): void {
        let nextIndex: number | null = null;
        if (this.focusedItem == null) {
            if (this.viewItems.length > 0) {
                nextIndex = 0;
            }
        } else {
            const currentIndex = this.viewItems.indexOf(this.focusedItem);
            if (currentIndex < 0) {
                throw new Error('Could not find selected item');
            }
            if (currentIndex < this.viewItems.length - 1) {
                nextIndex = currentIndex + 1;
            }
        }

        if (nextIndex != null) {
            const newFocusedItem = this.viewItems[nextIndex];
            if (newFocusedItem.element) {
                scrollIntoViewIfNeeded(newFocusedItem.element);
            }
            this.focusedItem = newFocusedItem;
        }
    }

    public onEnter(): void {
        if (this.focusedItem != null) {
            if (this.focusedItem === this.selectedViewItem) {
                this.close = null;
            }
            this.onItemSelect(this.focusedItem);
        }
    }

    public onLetter(letter: string): void {
        if (!this.textMember) {
            return;
        }

        const viewItem: ViewItem | undefined = this.viewItems.find(i => i.text != null && i.text.toLocaleLowerCase().startsWith(letter));

        if (viewItem != null) {
            if (viewItem.element != null) {
                viewItem.element.scrollIntoView(true);
            }
            this.focusedItem = viewItem;
        }
    }
}
