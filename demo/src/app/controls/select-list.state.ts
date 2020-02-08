import { TemplateRef } from "@angular/core"
import { In, Out, With, Calc } from 'ng-set-state';
import { extractMandatoryMember, scrollIntoViewIfNeeded } from "./helpers";

export type ViewItem = { model: Object, id: Object, text: string, focused: boolean, selected: boolean, element?: HTMLElement, templateContext: Object };

export type NewState = Partial<SelectListState> | null;

export type ItemTemplateContext = { $implicit: Object, text: string };

export class SelectListState {
    public static readonly ngInputs: (keyof SelectListState)[] = ["selected", "items", "idMember", "textMember", "itemTemplate"];

    public static readonly ngOutputs = ["selectedChange", "selectedItemChange", "close"];

    @In()
    public readonly items: Object[] | null = null;

    @In()
    public readonly idMember: string | null = null;

    @In()
    public readonly textMember: string | null = null;

    @In("itemTemplate")
    public readonly itemTemplateIn: TemplateRef<ItemTemplateContext> | null = null;

    public readonly itemTemplateDefault: TemplateRef<ItemTemplateContext> | null = null;

    @Calc(["itemTemplateIn", "itemTemplateDefault"], s => s.itemTemplateIn == null ? s.itemTemplateDefault : s.itemTemplateIn)
    public readonly itemTemplate: TemplateRef<{ $implicit: Object }> | null = null;

    @In()@Out()
    public readonly selected: Object | null = null;

    @Out("close")
    public readonly close: number = 0;

    public readonly viewItems: ViewItem[] = [];

    public readonly rootElement: HTMLElement;

    public readonly focusedItem: ViewItem | null = null;

    public readonly selectedViewItem: ViewItem | null = null;

    public readonly mouseMoved: boolean = false;

    @Out()
    public readonly selectedItem: Object | null = null;

    public onItemInit(viewItem: ViewItem, element: HTMLElement): NewState {
        viewItem.element = element;
        if (viewItem.selected) {
            element.scrollIntoView();
        }
        return null;
    }

    public onItemMouseEnter(viewItem: ViewItem): NewState {
        if (!this.mouseMoved) {
            return null;
        }
        return { focusedItem: viewItem };
    }

    public onItemMouseMove(viewItem: ViewItem): NewState {
        if (this.mouseMoved || this.focusedItem === viewItem) {
            return null;
        }
        return { focusedItem: viewItem, mouseMoved: true };
    }

    public onItemSelect(viewItem: ViewItem): NewState {
        if (this.selectedViewItem != null) {
            this.selectedViewItem.selected = false;
        }
        viewItem.selected = true;
        return { selectedViewItem: viewItem };
    }

    public onUp(): NewState {

        let nextIndex: number | null = null;
        if (this.focusedItem == null) {
            if (this.viewItems.length > 0) {
                nextIndex = 0;
            }
        } else {
            const currentIndex = this.viewItems.indexOf(this.focusedItem);
            if (currentIndex < 0) {
                throw new Error("Could not find selected item");
            }
            if (currentIndex > 0) {
                nextIndex = currentIndex - 1;
            } else {
                return { close: this.close + 1 };
            }
        }

        if (nextIndex != null) {
            const newFocusedItem = this.viewItems[nextIndex];
            if (newFocusedItem.element) {
                scrollIntoViewIfNeeded(newFocusedItem.element);
            }
            return { focusedItem: newFocusedItem };
        }
        return null;
    }

    public onDown(): NewState {
        let nextIndex: number | null = null;
        if (this.focusedItem == null) {
            if (this.viewItems.length > 0) {
                nextIndex = 0;
            }
        } else {
            const currentIndex = this.viewItems.indexOf(this.focusedItem);
            if (currentIndex < 0) {
                throw new Error("Could not find selected item");
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
            return { focusedItem: newFocusedItem };
        }
        return null;
    }

    public onEnter(): NewState {
        if (this.focusedItem != null) {
            if (this.focusedItem === this.selectedViewItem) {
                return { close: this.close + 1 };
            }
            return this.onItemSelect(this.focusedItem);
        }
        return null;
    }

    public onLetter(letter: string) {
        if (!this.textMember) {
            return null;
        }

        const viewItem: ViewItem | undefined = this.viewItems.find(i => i.text != null && i.text.toLocaleLowerCase().startsWith(letter));

        if (viewItem != null) {
            if (viewItem.element != null) {
                viewItem.element.scrollIntoView(true);
            }
            return { focusedItem: viewItem };
        }
        return null;
    }

    @With("selectedViewItem")
    public static withSelectedViewItem(currentState: SelectListState): NewState {
        if (currentState.selectedViewItem == null) {
            return {
                selected: null,
                selectedItem: null
            }
        } else {
            return {
                selected: currentState.extractId(currentState.selectedViewItem.model),
                selectedItem: currentState.selectedViewItem.model,
                focusedItem: currentState.selectedViewItem
            }
        }
    }

    @With("focusedItem")
    public static onFocusedItem(currentState: SelectListState, previousState: SelectListState): NewState {
        if (previousState.focusedItem != null && previousState.focusedItem.focused) {
            previousState.focusedItem.focused = false;
        }
        if (currentState.focusedItem != null && !currentState.focusedItem.focused) {
            currentState.focusedItem.focused = true;
        }
        return { mouseMoved: false };
    }

    @With("items", "idMember", "textMember")
    public static buildItems(currentState: SelectListState): NewState {

        if (currentState.items == null || currentState.items.length < 1) {
            return {viewItems: []};            
        }

        return {
            viewItems: currentState.items.map(i => ({
                model: i,
                id: currentState.extractId(i),
                text: extractMandatoryMember(i, currentState.textMember).toString(),
                focused: false,
                selected: currentState.checkModelIsSelected(i),
                templateContext: { $implicit: i, text: extractMandatoryMember(i, currentState.textMember).toString() }
            }))
        };
    }

    @With("viewItems", "selected")
    public static syncSelectedItem(currentState: SelectListState): NewState {

        let newSelectedItem: ViewItem | null = null;
        
        for (const viewItem of currentState.viewItems) {
            viewItem.selected = currentState.checkModelIsSelected(viewItem.model);
            if (viewItem.selected) {
                if (newSelectedItem != null) {
                    throw new Error("selected item id is not unique");
                }
                newSelectedItem = viewItem;
            }
        }
        return { selectedViewItem: newSelectedItem };
    }

    private extractId(item: Object): Object {
        return extractMandatoryMember(item, this.idMember);
    }

    private checkModelIsSelected(model: Object): boolean {
        if (this.selected == null) {
            return false;
        }
        return this.extractId(model) === this.selected;
    }
}
