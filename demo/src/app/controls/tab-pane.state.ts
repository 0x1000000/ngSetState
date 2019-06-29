import { In, Out } from 'ng-set-state';

export class TabPaneState {

    public static readonly ngInputs: (keyof TabPaneState)[] = ["title", "id"];

    public static readonly ngOutputs: string[] = ["idChange", "isVisibleChange"];

    @In()
    public readonly title: string = "";

    @In()
    @Out()
    public readonly id: string | null = null;

    @Out()
    public readonly isVisible: boolean = false;

    public withEnsuredId(): Partial<TabPaneState> | null {
        if (this.id == null) {
            return { id: "idXXXXXX".replace(/[X]/g, () => Math.round(Math.random() * 99).toString()) };
        }
        return null;
    }
}
