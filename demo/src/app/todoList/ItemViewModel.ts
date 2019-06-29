import { TodoItem } from './TodoService';

export class ItemViewModel {

    private static counter: number = 0;

    public static createExisting(model: TodoItem) {
        return new ItemViewModel(model, false, null);
    }

    public static createNew() {
        return new ItemViewModel(null, true, null);
    }

    public readonly vmId: number;


    private constructor(readonly model: TodoItem | null, public readonly isDirty: boolean, public readonly previousModel: TodoItem | null) {
        this.vmId = ++ItemViewModel.counter;

    }

    public withModel(model: TodoItem | null, isDirty: boolean) {
        if (this.isDirty === isDirty && this.model === model) {
            return this;
        }
        return new ItemViewModel(model, isDirty, this.model === model ? this.previousModel : this.model);
    }

    public withIsDirty(isDirty: boolean) {
        if (this.isDirty === isDirty) {
            return this;
        }
        return new ItemViewModel(this.model, isDirty, this.previousModel);
    }
}
