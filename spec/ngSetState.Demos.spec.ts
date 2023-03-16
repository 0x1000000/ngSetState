import { } from "jasmine";
import { ComponentState, initializeImmediateStateTracking, StateDiff, With } from "../src";

describe('Demo', ()=> {

    fit('Basic', async ()=> {
        class Component {
            constructor() {
                initializeImmediateStateTracking(this);
            }

            arg1: number = 0;

            arg2: number = 0;

            sum: number = 0;

            resultString: string = '';

            @With('arg1', 'arg2')
            static calcSum(state: ComponentState<Component>): StateDiff<Component> {
                return {
                    sum: state.arg1 + state.arg2
                };
            }

            @With('sum')
            static prepareResultString(state: ComponentState<Component>): StateDiff<Component> {
                return {
                    resultString: `Result: ${state.sum}`
                };
            }    
        }

        const component = new Component();

        component.arg1 = 3;
        console.log(component.resultString);
        //Result: 3

        component.arg2 = 2;
        console.log(component.resultString);
        //Result: 5
    });
});
