import { In, Out, With } from 'ng-set-state';
import { TabPaneComponent } from "./tab-pane.component";

type NewState = Partial<TabsState> | null;

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

    public readonly elements = new Map<string, HTMLElement>();

    public onLabelCreated(label: TabLabel, labelElement: HTMLElement): NewState {
        this.elements.set(label.id, labelElement);
        if (label.id === this.selectedId) {
            return TabsState.moveBar(this);
        }
        return null;
    }

    public onLabelDestroyed(label: TabLabel, labelElement: HTMLElement): NewState {
        this.elements.delete(label.id);
        if (label.id === this.selectedId) {
            return TabsState.moveBar(this);
        }
        return null;
    }

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

    @With("selectedId", "panes")
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

        }
        return null;
    }

    @With("selectedId")
    public static moveBar(currentState: TabsState): Partial<TabsState> | null {
        if (currentState.selectedId != null && currentState.elements.has(currentState.selectedId)) {
            const element = currentState.elements.get(currentState.selectedId);
            return { barOffset: element!.offsetLeft, barWidth: element!.offsetWidth };
        }
        if (currentState.selectedId == null || !currentState.elements.has(currentState.selectedId)) {
            return { barOffset: null, barWidth: null };
        }
        return null;
    }
}

export class TabLabel {
    constructor(public readonly pane: TabPaneComponent) {

    }

    public get id(): string {
        return this.pane.state.id!;
    }

    public get title(): string {
        return this.pane.state.title;
    }

    public get selected(): boolean {
        return this.pane.state.isVisible;
    }
}
