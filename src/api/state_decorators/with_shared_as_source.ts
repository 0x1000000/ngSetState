import { Constructor } from './../../api/common';
import { ComponentState } from './../../api/state_tracking';
import { Functions } from './../../impl/functions';

type DecoratorResult<TComponent> = (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => any;

type IWithCallOnInit<TComponent> = {
  CallOnInit(): DecoratorResult<TComponent>;
}

type Parameters = {
  callOnInit?: boolean;
}

export function WithSharedAsSource<TComponent, TShared>(sharedType: Constructor<TShared>, ...propNames: (keyof ComponentState<TShared>)[]): DecoratorResult<TComponent> & IWithCallOnInit<TComponent> {


  let parameters: Parameters = {};

  const decoratorResult: any =  (target: Constructor<TComponent>, propertyKey: string, descriptor: PropertyDescriptor) => {
      Functions.addSharedModifier(false, sharedType, target, propertyKey, descriptor, propNames, parameters.callOnInit);
  }

  Object.assign(decoratorResult, {
    CallOnInit: () => {
      parameters.callOnInit = true;
      return decoratorResult;
    }
  } satisfies IWithCallOnInit<TComponent>);

  return decoratorResult;
}

export type WithSharedAsSourceArg<TComponent, TShared> = {
  currentSharedState: ComponentState<TShared>,
  previousSharedState: ComponentState<TShared>,
  currentState: ComponentState<TComponent>
}
