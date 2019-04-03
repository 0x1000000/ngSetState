import { In, With, Out } from "../ngSetState";

export class State {

    public static readonly ngInputs = ["items", "selected", "titleProperty", "valueProperty"];

    public static readonly ngOutputs = ["selectedChange","selectedItemChange"];

    constructor(initialItems?: Partial<State>) {
        if (initialItems) {
            Object.assign(this, initialItems);
        }
    }

    @In()
    public readonly items: any[];

    @In()
    public readonly titleProperty: string;

    @In()
    public readonly valueProperty: string;

    @In()
    @Out()
    public readonly selected: Object;

    @Out()
    public readonly selectedItem: any;

    public readonly radioName: string;

    public readonly viewItems: ItemView[];

    @With("items", "titleProperty", "valueProperty", "radioName")
    public static withItems(state: State): Partial<State> | null {

        if (!state.items || !state.radioName) {
            return null;
        }

        const newViewItems = state.items.map((i,index) => <ItemView>({
            id: state.radioName + index.toString(),
            value: State.getProperty(i, state.valueProperty),
            title: State.getProperty(i, state.titleProperty),
            checked: state.shouldBeChecked(State.getProperty(i, state.valueProperty)),
            target: i,
        }));

        return {
            viewItems: newViewItems,
            selectedItem: State.getSelectedItem(newViewItems)
        };
    }

    @With("selected")
    public static withSelected(state: State): Partial<State> | null {

        const requireUpdate = (vi: ItemView) => vi.checked && !state.shouldBeChecked(vi.value) || !vi.checked && state.shouldBeChecked(vi.value);

        if (state.viewItems && state.viewItems.some(vi => requireUpdate(vi))) {
            const newViewItems = state.viewItems.map(vi => !requireUpdate(vi)
                ? vi
                : Object.assign(vi,
                    <Partial<ItemView>>{
                        checked: state.shouldBeChecked(vi.value)
                    }));
            return {
                viewItems: newViewItems,
                selectedItem: State.getSelectedItem(newViewItems)
            }
        }
        return null;
    }

    private shouldBeChecked(itemValue: Object): boolean {
        return this.selected != null && itemValue === this.selected;
    }

    private static getSelectedItem(viewItems: ItemView[]): any {
        if (viewItems) {
            const vi = viewItems.find(i => i.checked);
            if (vi) {
                return vi.target;
            }
        }
        return null;
    }

    private static getProperty(item: Object, propName: string): Object {
        if (!item || !propName) {
            return item;
        }
        return item[propName];
    }
}

export type ItemView = {
    readonly id: string,
    readonly value: Object,
    readonly title: string,
    readonly checked: boolean,
    readonly target: any,
};
