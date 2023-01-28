import {
  Component,
  ChangeDetectionStrategy,
  Input,
  EventEmitter,
  Output,
} from '@angular/core';
import {
  ComponentState,
  ComponentStateDiff,
  initializeStateTracking,
  With,
} from 'ng-set-state';
import { makeId } from '../helpers';

type State = ComponentState<RadioListComponent>;
type NewState = ComponentStateDiff<RadioListComponent>;

@Component({
  selector: 'radio-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-list.component.html',
})
export class RadioListComponent {
  constructor() {
    initializeStateTracking<RadioListComponent>(this, {
      includeAllPredefinedFields: true,
    });
  }

  public onRadioChange(item: ItemView): void {
    this.selected = item.value;
  }

  @Input()
  public items: any[] = [];

  @Input()
  public titleProperty: string = '';

  @Input()
  public valueProperty: string = '';

  @Input()
  public selected: any = null;

  @Output()
  public readonly selectedChange = new EventEmitter<any>();

  public selectedItem: any = null;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  public radioName: string = makeId(16);

  public viewItems: ItemView[] = [];

  @With('items', 'titleProperty', 'valueProperty', 'radioName')
  public static withItems(state: State): NewState | null {
    if (!state.items) {
      return null;
    }

    const newViewItems = state.items.map(
      (i, index) =>
        ({
          id: state.radioName + index.toString(),
          value: RadioListComponent.getProperty(i, state.valueProperty),
          title: RadioListComponent.getProperty(i, state.titleProperty),
          checked: RadioListComponent.shouldBeChecked(
            state,
            RadioListComponent.getProperty(i, state.valueProperty)
          ),
          target: i,
        } as ItemView)
    );

    return {
      viewItems: newViewItems,
      selectedItem: RadioListComponent.getSelectedItem(newViewItems),
    };
  }

  @With('selected')
  public static withSelected(state: State): NewState | null {
    const requireUpdate = (vi: ItemView) =>
      (vi.checked && !RadioListComponent.shouldBeChecked(state, vi.value)) ||
      (!vi.checked && RadioListComponent.shouldBeChecked(state, vi.value));

    if (state.viewItems && state.viewItems.some((vi) => requireUpdate(vi))) {
      const newViewItems = state.viewItems.map((vi) =>
        !requireUpdate(vi)
          ? vi
          : Object.assign(vi, {
              checked: RadioListComponent.shouldBeChecked(state, vi.value),
            } as Partial<ItemView>)
      );
      return {
        viewItems: newViewItems,
        selectedItem: RadioListComponent.getSelectedItem(newViewItems),
      };
    }
    return null;
  }

  private static getSelectedItem(viewItems: ItemView[]): any {
    if (viewItems) {
      const vi = viewItems.find((i) => i.checked);
      if (vi) {
        return vi.target;
      }
    }
    return null;
  }

  private static getProperty(item: Object, propName: string): Object {
    if (!item || !propName) {
      return item;
    }
    return (item as any)[propName];
  }

  private static shouldBeChecked(s: State, itemValue: Object): boolean {
    return s.selected != null && itemValue === s.selected;
  }
}

export type ItemView = {
  readonly id: string;
  readonly value: Object;
  readonly title: string;
  readonly checked: boolean;
  readonly target: any;
};
