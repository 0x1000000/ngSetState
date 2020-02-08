import { In, With, Out, WithAsync, Calc} from "ng-set-state";
import { delayMs, extractMandatoryMember, focusFirstDescendantOrSelf } from "./helpers";

type NewState = Partial<DropDownState> | null;

export class DropDownState{

    public static readonly ngInputs: (keyof DropDownState)[] = ["selected", "items", "idMember", "textMember", "itemTemplate"];

    public static readonly ngOutputs: string[] = ["selectedChange"];

    @In()@Out()
    public readonly selected: Object | null = "003";

    @In()
    public readonly items: Object[] | null = null;

    @In()
    public readonly idMember: string | null = null;

    @In()
    public readonly textMember: string | null = null;

    @In("itemTemplate")
    public readonly itemTemplateIn: any | null = null;

    public readonly itemTemplateDefault: any | null = null;

    @Calc(["itemTemplateIn", "itemTemplateDefault"], s => s.itemTemplateIn == null ? s.itemTemplateDefault : s.itemTemplateIn)
    public readonly itemTemplate: any | null = null;

    @Calc(["itemTemplateIn", "selectedItem"], s => s.itemTemplateIn != null ? ({$implicit: s.selectedItem}) : null)
    public readonly itemTemplateContext: {$implicit: any}|null = null;

    public readonly isOpen: boolean = false;

    public readonly focused: boolean = false;

    public readonly isOpenAnimationDone: boolean = false;

    public readonly contentAnimationState: "open" | "close" = "close";

    public readonly selectedItem: Object | null = null;

    public readonly text: string = "(none)";

    public readonly elDropPane: Element | null = null;

    public readonly rootElement: HTMLElement | null = null;

    public toggle(): NewState {
        if (this.items == null || this.items.length < 1) {
            return {
                isOpen: false
            };
        }
        return { isOpen: !this.isOpen, isOpenAnimationDone: false };
    }

    public onOpenAnimationDone(toState: string): NewState {
        if (toState === "open") {
            return { isOpenAnimationDone: this.contentAnimationState === "open" };
        }
        return null;
    }

    public onEsc(): NewState {
        if (this.isOpen) {
            return this.toggle();
        }
        return null;
    }

    public onEnter(): NewState {
        if (!this.isOpen) {
            return this.toggle();
        }
        return null;
    }

    public onDown(): NewState {
        return this.onEnter();
    }

    @WithAsync("isOpen")
    public static async onOpenAsync(getCurrentState: () => DropDownState): Promise<NewState> {
        await delayMs(0);
        const currentState = getCurrentState();
        return { contentAnimationState: currentState.isOpen ? "open" : "close" };
    }

    @With("selectedItem")
    public static onSelectedItem(currentState: DropDownState): NewState {
        return {
            text: currentState.selectedItem ? extractMandatoryMember(currentState.selectedItem, currentState.textMember).toString() : "(empty)",
            isOpen: false
        };
    }

    @With("selected", "items")
    public static syncSelectedItem(currentState: DropDownState): NewState {

        const newSelectedItem = currentState.items != null && currentState.selected != null
            ? currentState.items.find(i => extractMandatoryMember(i, currentState.idMember) === currentState.selected) || null
            : null;

        return { selectedItem: newSelectedItem };
    }

    @With("elDropPane")
    public static onDropDownPaneCreatedDestroyed(currentState: DropDownState): NewState {
        let focused = false;
        if (currentState.elDropPane) {
            focusFirstDescendantOrSelf(currentState.elDropPane!, true);
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

}
