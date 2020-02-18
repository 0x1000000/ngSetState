import { WithStateBase, With } from "../src/index";
import { } from "jasmine";
import { PromiseList, delayMs } from './helpers';

describe('Time tests: Debounce...', () => {
    it('Basic', async () => {

        let counter = 0;

        const component = new TestDebounceComponent(0,0, ()=>counter++);

        component.modifyState("arg", 1);

        expect(component.state.result).toBe(0);

        for (let i = 1; i <= 5; i++) {
            component.modifyState("arg", i);
            await delayMs(100);
            expect(component.state.result).toBe(0);
        }

        await delayMs(300);

        expect(component.state.result).toBe(5);
        expect(counter).toBe(1);
    });

    it('Cancel', async () => {
        let counter = 0;

        const component = new TestDebounceComponent(17, 100, () => counter++);

        for (let i = 1; i <= 5; i++) {
            component.modifyState("arg", i);
            await delayMs(100);
            expect(component.state.result).toBe(100);
        }

        component.modifyState("arg", 17);

        await delayMs(300);

        expect(component.state.result).toBe(100);
        expect(counter).toBe(1);
    });

});


class TestDebounceState {

    constructor(public readonly arg: number, public readonly result: number, private readonly _callback: ()=>void) { }

    @With("arg").Debounce(300)
    public static calcResult2(state: TestDebounceState): Partial<TestDebounceState> {
        state._callback();
        return { result: state.result + state.arg };
    }
}


class TestDebounceComponent extends WithStateBase<TestDebounceState> {
    constructor(arg: number, result: number, callback: () => void) {
        super(new TestDebounceState(arg, result, callback), null, null);
    }
}
