import { In, With, Out, WithAsync, Calc} from "ng-set-state";
import { delayMs, extractMandatoryMember, focusFirstDescendantOrSelf } from "./helpers";

type NewState = Partial<CheckboxState> | null;

export class CheckboxState{

    public static readonly ngInputs: (keyof CheckboxState)[] = ["checked", "round", "disabled"];

    public static readonly ngOutputs: string[] = ["checkedChange"];

    @In()@Out()
    public readonly checked: boolean = false;

    @In()
    public readonly round: boolean = false;

    @In()
    public readonly disabled: boolean = false;

    @Calc(["checked", "round"], s=>s.checked && !s.round)
    public readonly boxChecked: boolean = false;

    @Calc(["checked", "round"], s=>s.checked && s.round)
    public readonly roundChecked: boolean = false;


    public toggle(): NewState {
        return { checked: !this.checked };
    }
}
