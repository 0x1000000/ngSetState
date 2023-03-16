export type Tab = "intro" | "calculator" | "todoList" | "dropDown" | 'fromDemo'

export class AppState {
    public readonly selectedTab: Tab = "intro";
}
