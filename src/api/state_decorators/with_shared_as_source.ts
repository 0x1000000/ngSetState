import { Constructor } from './../../api/common';
import { ComponentState } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';

export function WithSharedAsSource<TComponent, TShared>(sharedType: Constructor<TShared>, ...propNames: (keyof ComponentState<TShared>)[]) {
  return (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {
      Functions.addSharedModifier(false, sharedType, target, propertyKey, descriptor, propNames);
  }    
}

export type WithSharedAsSourceArg<TComponent, TShared> = {
  currentSharedState: ComponentState<TShared>,
  previousSharedState: ComponentState<TShared>,
  currentState: ComponentState<TComponent>
}
