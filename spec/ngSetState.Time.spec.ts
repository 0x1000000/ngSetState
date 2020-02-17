import { WithStateBase, With} from "../src/ngSetState";
import { } from "jasmine";
import { PromiseList, delayMs } from './helpers';

describe('Time tests: Debounce...', () => {
    it('Basic', async () => {
        const component = new TestDebounceComponent(0,0);

        component.modifyState("arg", 1);

        expect(component.state.result).toBe(0);

        for (let i = 1; i <= 5; i++) {
            component.modifyState("arg", i);
            await delayMs(100);
            expect(component.state.result).toBe(0);
        }

        await delayMs(300);

        expect(component.state.result).toBe(5);
    });

    it('Cancel', async () => {
        const component = new TestDebounceComponent(17, 100);

        for (let i = 1; i <= 5; i++) {
            component.modifyState("arg", i);
            await delayMs(100);
            expect(component.state.result).toBe(100);
        }

        component.modifyState("arg", 17);

        await delayMs(300);

        expect(component.state.result).toBe(100);
    });

});


class TestDebounceState {

    constructor(public readonly arg: number, public readonly result: number) { }

    @With("arg").Debounce(300)
    public static calcResult2(state: TestDebounceState): Partial<TestDebounceState> {
        return { result: state.result + state.arg };
    }
}


class TestDebounceComponent extends WithStateBase<TestDebounceState> {
    constructor(arg: number, result: number) {
        super(new TestDebounceState(arg, result), null, null);
    }
}
