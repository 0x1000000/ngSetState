import { In, Out, With, Calc } from 'ng-set-state';
import { extractMandatoryMember } from "./helpers";

export type ViewItem = { model: Object, id: Object, text: string, focused: boolean, selected: boolean, element?: HTMLElement };

export type NewState = Partial<SelectListState> | null;

export class SelectListState {
    public static readonly ngInputs: (keyof SelectListState)[] = ["selected", "items", "idMember", "textMember"];

    public static readonly ngOutputs = ["selectedChange", "selectedItemChange"];

    @In()
    public readonly items: Object[] | null = null;

    @In()
    public readonly idMember: string | null = null;

    @In()
    public readonly textMember: string | null = null;

    @In()@Out()
    public readonly selected: Object | null = null;

    public readonly viewItems: ViewItem[] = [];

    public readonly rootElement: HTMLElement;

    public readonly focusedItem: ViewItem | null = null;

    public readonly selectedViewItem: ViewItem|null = null;

    @Out()
    @Calc(["selectedViewItem"], (s: SelectListState) => s.selectedViewItem == null ? null : s.selectedViewItem.model)
    public readonly selectedItem: Object | null = null;

    public onItemInit(viewItem: ViewItem, element: HTMLElement): NewState {
        viewItem.element = element;
        if (viewItem.selected) {
            element.scrollIntoView();
        }
        return null;
    }

    public onItemMouseEnter(viewItem: ViewItem): NewState {
        if (this.focusedItem != null) {
            this.focusedItem.focused = false;
        }
        viewItem.focused = true;
        return { focusedItem: viewItem };
    }

    public onItemSelect(viewItem: ViewItem): NewState {
        if (this.selectedViewItem != null) {
            this.selectedViewItem.selected = false;
        }
        viewItem.selected = true;
        return { selectedViewItem: viewItem, selected: this.extractId(viewItem.model) };
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
                selected: currentState.isSelectedModel(i)
            }))
        };
    }

    @With("viewItems", "selected")
    public static syncSelectedItem(currentState: SelectListState): NewState {

        let newSelectedItem: ViewItem | null = null;
        
        for (const viewItem of currentState.viewItems) {
            viewItem.selected = currentState.isSelectedModel(viewItem.model);
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

    private isSelectedModel(model: Object): boolean {
        if (this.selected == null) {
            return false;
        }
        return this.extractId(model) === this.selected;
    }
}
