import { StateActionBase } from "ng-set-state";
import { UserViewModel } from "./userStorage";

export class ActionSaveRequest extends StateActionBase {
    constructor() {
        super();
    }
}

export class ActionItemEdited extends StateActionBase {
    constructor(readonly id: number, readonly change: Partial<UserViewModel>) {
        super();
    }
}

export class ActionDeleteItem extends StateActionBase {
    constructor(readonly id: number) {
        super();
    }
}

export class ActionNewItem extends StateActionBase {
    constructor() {
        super();
    }
}
