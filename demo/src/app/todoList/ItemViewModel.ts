import { TodoItem } from './TodoService';

export class ItemViewModel {

    private static counter: number = 0;

    public static createExisting(model: TodoItem) {
        return new ItemViewModel(++ItemViewModel.counter, model, false, null);
    }

    public static createNew() {
        return new ItemViewModel(++ItemViewModel.counter, null, true, null);
    }


    private constructor(public readonly vmId: number, readonly model: TodoItem | null, public readonly isDirty: boolean, public readonly previousModel: TodoItem | null) {
    }

    public withModel(model: TodoItem | null, isDirty: boolean) {
        if (this.isDirty === isDirty && this.model === model) {
            return this;
        }
        return new ItemViewModel(this.vmId, model, isDirty, this.model === model ? this.previousModel : this.model);
    }

    public withPreviousModel(previousModel: TodoItem) {
        if (this.previousModel === previousModel) {
            return this;
        }
        return new ItemViewModel(this.vmId, this.model, this.isDirty, previousModel);
    }

    public withIsDirty(isDirty: boolean) {
        if (this.isDirty === isDirty) {
            return this;
        }
        return new ItemViewModel(this.vmId, this.model, isDirty, this.previousModel);
    }
}
