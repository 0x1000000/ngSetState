import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from "@angular/core";
import { initializeImmediateStateTracking, IStateHandler, BindToShared } from "ng-set-state";
import { ItemStatus, UserStorage, UserViewModel } from "./userStorage";
import { ActionDeleteItem, ActionNewItem } from "./userStorage.Actions";

@Component({
    selector: 'form-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './form-demo.component.html',
    styleUrls: ['./form-demo.component.css']
})
export class FormDemoComponent {

    stateHandler?: IStateHandler<FormDemoComponent>;

    deletingItem: UserViewModel | null = null;

    @BindToShared(UserStorage, 'selectedItem')
    selectedItem: UserViewModel | null = null

    @BindToShared(UserStorage, 'items')
    items: UserViewModel[] = [];

    @BindToShared(UserStorage, 'loading')
    loading: boolean = false;

    @BindToShared(UserStorage, 'itemStatus')
    itemStatus: {[id: number]: ItemStatus} = {};

    constructor(private readonly userStorage: UserStorage, private _cd: ChangeDetectorRef) {
    }

    ngOnInit(){
        this.stateHandler = initializeImmediateStateTracking<FormDemoComponent>(this, 
            {
                sharedStateTracker: [this.userStorage], 
                onStateApplied: () => this._cd.detectChanges()
            });
        this.stateHandler.subscribeSharedStateChange();
    }

    ngOnDestroy() {
        this.stateHandler?.release();
    }

    isSelectedItem(item: UserViewModel): boolean {
        return this.selectedItem?.user.id === item.user.id;
    }
    
    onSelectItem(item: UserViewModel): void {
        this.selectedItem = item;
    }

    onDeleteItem(item: UserViewModel): void {
        //this.stateHandler?.execAction(new ActionDeleteItem(item.user.id));
        this.deletingItem = item;
    }

    onDeleteConfirm(result: string) {
        if (result == 'yes' && this.deletingItem != null) {
            this.stateHandler?.execAction(new ActionDeleteItem(this.deletingItem.user.id));
        }
        this.deletingItem = null;
    }

    onNewItem() {
        this.stateHandler?.execAction(new ActionNewItem());
    }

    getStatus(item: UserViewModel): string {
        return this.itemStatus?.[item.user.id] ?? '';
    }
}