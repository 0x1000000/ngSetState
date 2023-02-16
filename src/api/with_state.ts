import { IWithState } from './i_with_state';
import { Constructor } from './common';
import { Functions } from './../impl/functions';
import { ComponentStateDiff, InitStateTrackingOptions } from './state_tracking';

type InitialOptions<TComponent> = Omit<InitStateTrackingOptions<TComponent>, 'onStateApplied'>;
type FactoryOrOptions<TComponent> = (() => ComponentStateDiff<TComponent>) | InitialOptions<TComponent>;

export function WithState<TComponent>(stateType: Constructor<TComponent>, factory?: FactoryOrOptions<TComponent>): (t: Constructor<any>) => any {

    if (stateType == null) {
        throw new Error("Initial state type should be defined or a factory provided");
    }

    return (target: Constructor<any>) => {
        return class extends target implements Partial<IWithState<TComponent>> {

            constructor(...args: any[]) {
                super(...args);


                var component = new stateType();

                if (component == null) {
                    throw new Error("Constructor has not returned an object");
                }

                let options: InitialOptions<TComponent> | undefined = undefined;

                if (factory != null) {
                    if (typeof factory === 'function') {
                        options = {
                            initialState: factory(),
                        }
                    } else {
                        options = factory;
                    }
                }

                Functions.makeWithState(this, component, options)
            }
        };
    };
}