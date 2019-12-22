import { TodoItem } from './TodoService';

export type SyncMode = "saved" | "pending" | "active" | "error";

export class ItemViewModel {

    private static counter: number = 0;

    public static createExisting(model: TodoItem) {
        return new ItemViewModel(++ItemViewModel.counter, model, "saved", null);
    }

    public static createNew(model: TodoItem) {
        return new ItemViewModel(++ItemViewModel.counter, model, "pending", null);
    }

    private constructor(public readonly vmId: number, readonly model: TodoItem, public readonly syncMode: SyncMode, public readonly previousModel: TodoItem | null) {}

    public withModel(model: TodoItem, syncMode: SyncMode) {
        if (this.syncMode === syncMode && this.model === model) {
            return this;
        }
        return new ItemViewModel(this.vmId, model, syncMode, this.model === model ? this.previousModel : this.model);
    }

    public withModelId(modelId: number) {
        if (this.model != null && this.model.id === modelId) {
            return this;
        }

        const newModel: TodoItem = Object.assign({}, this.model, <Partial<TodoItem>>{ id: modelId });

        return new ItemViewModel(this.vmId, newModel, this.syncMode, this.previousModel);
    }

    public withPreviousModel(previousModel: TodoItem) {
        if (this.previousModel === previousModel) {
            return this;
        }
        return new ItemViewModel(this.vmId, this.model, this.syncMode, previousModel);
    }

    public withsyncMode(syncMode: SyncMode) {
        if (this.syncMode === syncMode) {
            return this;
        }
        return new ItemViewModel(this.vmId, this.model, syncMode, this.previousModel);
    }
}
