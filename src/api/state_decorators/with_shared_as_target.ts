import { Constructor } from './../../api/common';
import { ComponentState } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';

export function WithSharedAsTarget<TComponent, TShared>(sharedType: Constructor<TShared>, ...propNames: (keyof ComponentState<TComponent>)[]) {
  return (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {
      Functions.addSharedModifier(true, sharedType, target, propertyKey, descriptor, propNames);
  }    
}

export type WithSharedAsTargetArg<TComponent, TShared> = {
  currentState: ComponentState<TComponent>
  previousState: ComponentState<TComponent>,
  currentSharedState: ComponentState<TShared>
}
