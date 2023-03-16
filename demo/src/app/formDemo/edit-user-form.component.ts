import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from "@angular/core";
import { ComponentState, ComponentStateDiff, initializeImmediateStateTracking, With, WithAction, StateActionBase, IStateHandler, BindToShared, WithSharedAsSource, WithSharedAsSourceArg } from "ng-set-state";
import { StateDiff } from "ng-set-state/dist/api/state_tracking";
import { FormField } from "../lib/forms/form-descriptor";
import { FormFieldsBuilder } from "../lib/forms/form-fields-builder";
import { User, UserStorage, UserViewModel } from "./userStorage";
import { ActionItemEdited } from "./userStorage.Actions";

type FormModel = User;

@Component({
    selector: 'edit-user-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './edit-user-form.component.html'
})
export class EditUserFormComponent {

    private _isInitialized = false;

    readonly formFields: FormField[];

    viewModel: UserViewModel | null = null;

    initialFormData: FormModel | null = null;

    currentFormData: FormModel | null = null;

    isError: boolean = false;

    isDirty: boolean = false;

    isSaveEnabled = true;

    stateHandler: IStateHandler<EditUserFormComponent>;

    constructor(userStorage: UserStorage, private _cd: ChangeDetectorRef) {

        this.formFields = new FormFieldsBuilder<FormModel>()
            .addTextField({id: 'firstName', label: 'First Name'}).mandatory()
            .addTextField({id: 'lastName', label: 'Last Name'}).mandatory()
            .addBoolField({id: 'active', label: 'IsActive'})
            .done();

        this.stateHandler = initializeImmediateStateTracking<EditUserFormComponent>(this, {
            sharedStateTracker: [userStorage], 
            onStateApplied: () => { if(this._isInitialized) this._cd.detectChanges(); },
            errorHandler: (e) => {alert(e); return true; }
        });
        this.stateHandler.subscribeSharedStateChange();
    }

    ngOnInit(){
        this._isInitialized = true;
    }

    ngOnDestroy() {
        this._isInitialized = false;
        this.stateHandler.release();
    }

    @WithSharedAsSource(UserStorage, 'selectedItem')
    static onStorageUserSelect(arg: WithSharedAsSourceArg<EditUserFormComponent, UserStorage>): ComponentStateDiff<EditUserFormComponent> {

        const selectedItem = arg.currentSharedState.selectedItem;
        if(selectedItem == null) {
            return {
                viewModel: null,
                initialFormData: null,
                currentFormData: null,
                isError: false,
                isDirty: false
            };
        }
        return {
            viewModel: selectedItem,
            initialFormData: selectedItem.originalUser ?? selectedItem.user,
            currentFormData: selectedItem.user,
            isDirty: selectedItem.originalUser != null,
            isError: !selectedItem.isValid,
        };
    }
    
    @With('currentFormData', 'isDirty', 'isError')
    static onEdit(s: ComponentState<EditUserFormComponent>): StateDiff<EditUserFormComponent> {
        if (s.currentFormData != null && s.initialFormData != null) {
            if (s.isDirty) {
                return [new ActionItemEdited(s.currentFormData.id, {originalUser: s.initialFormData, user: s.currentFormData, isValid: !s.isError})];
            }
            else {
                return [new ActionItemEdited(s.currentFormData.id, {originalUser: null, user: s.initialFormData, isValid: !s.isError})];
            }            
        }
        return null;
    }
}