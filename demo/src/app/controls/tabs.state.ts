import { In, Out, With } from 'ng-set-state';
import { TabPaneComponent } from "./tab-pane.component";

export class TabsState {

    public static readonly ngInputs: (keyof TabsState)[] = ["selectedId"];

    public static readonly ngOutputs: string[] = ["selectedIdChange"];

    @In()
    @Out()
    public readonly selectedId: string | null = null;

    public readonly panes: TabPaneComponent[] = [];

    public readonly labels: TabLabel[] = [];

    public readonly barOffset: number | null;

    public readonly barWidth: number | null;

    @With("panes")
    public static onNewPanes(currentState: TabsState): Partial<TabsState> | null {
        currentState.panes.forEach(p => p.ensureId());

        return {
            selectedId: currentState.panes.some(p => p.state.id === currentState.selectedId)
                ? currentState.selectedId
                : currentState.panes.length > 0
                    ? currentState.panes[0].state.id
                    : null,
            labels: currentState.panes.map(i => new TabLabel(i))
    };
    }

    @With("selectedId")
    public static onSelectedId(currentState: TabsState): Partial<TabsState> | null {
        if (currentState.panes.length > 0) {
            const hasVisible = currentState.panes.reduce((acc, next) => next.setVisibility(next.state.id === currentState.selectedId) || acc, false);

            if (!hasVisible) {
                currentState.panes[0].setVisibility(true);
                return {
                    selectedId: currentState.panes[0].state.id
                };
            } else {
                return null;
            }

        } else {
            return { selectedId: null };
        }
    }
}

export class TabLabel {
    constructor(public readonly pane: TabPaneComponent) {

    }

    public get id(): string | null {
        return this.pane.state.id;
    }

    public get title(): string {
        return this.pane.state.title;
    }

    public get selected(): boolean {
        return this.pane.state.isVisible;
    }
}
