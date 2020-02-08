import { In, With, Out, WithAsync, Calc} from "ng-set-state";
import { Country, countryList } from './../Countries';

type NewState = Partial<DropDownDemoState> | null;

export class DropDownDemoState{

    public static readonly ngInputs: (keyof DropDownDemoState)[] = [];

    public static readonly ngOutputs: string[] = [];

    public readonly selectedCountry: string | null = null;

    public readonly countryList: Country[] = countryList;

    @Calc(["itemTemplateCustom", "useCustomTemplate"], s => s.useCustomTemplate ? s.itemTemplateCustom : null)
    public readonly itemTemplate: any = null;

    public readonly itemTemplateCustom: any = null;

    public readonly useCustomTemplate: boolean = false;
}
