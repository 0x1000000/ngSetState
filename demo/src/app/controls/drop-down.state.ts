import { In, With, Out, WithAsync, } from "ng-set-state";
import { delayMs, extractMandatoryMember } from "./helpers";

type NewState = Partial<DropDownState> | null;

export class DropDownState{

    public static readonly ngInputs: (keyof DropDownState)[] = ["selected", "items", "idMember", "textMember"];

    public static readonly ngOutputs: string[] = ["selectedChange"];

    @In()@Out()
    public readonly selected: Object | null = "003";

    @In()
    public readonly items: Object[] | null = null;

    @In()
    public readonly idMember: string | null = null;

    @In()
    public readonly textMember: string | null = null;

    public readonly isOpen: boolean = false;

    public readonly isOpenAnimationDone: boolean = false;

    public readonly contentAnimationState: "open" | "close" = "close";

    public readonly selectedItem: Object | null = null;

    public text: string = "(none)";

    public toggle(): NewState {
        if (this.items == null || this.items.length < 1) {
            return {
                isOpen: false
            };
        }
        return { isOpen: !this.isOpen, isOpenAnimationDone: false };
    }

    public onOpneAnimationDone(toState: string): NewState {
        if (toState === "open") {
            return { isOpenAnimationDone: this.contentAnimationState === "open" };
        }
        return null;
    }

    @WithAsync("isOpen")
    public static async onOpenAsync(getCurrentState: () => DropDownState): Promise<NewState> {

        await delayMs(0);

        return { contentAnimationState: getCurrentState().isOpen ? "open" : "close" };
    }

    @With("selectedItem")
    public static onSelectedItem(currentState: DropDownState): NewState {
        console.log(JSON.stringify(currentState.selectedItem));
        return {
            text: currentState.selectedItem ? extractMandatoryMember(currentState.selectedItem, currentState.textMember).toString() : "(empty)",
            isOpen: false
        };
    }

    @With("selected", "items")
    public static syncSelectedItem(currentState: DropDownState): NewState {

        const newSelectedItem = currentState.items != null && currentState.selected != null ? currentState.items.find(i=> extractMandatoryMember(i, currentState.idMember) === currentState.selected) || null : null;

        return { selectedItem: newSelectedItem };
    }

}
