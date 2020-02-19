import { WithStateBase, With, WithAsync } from "../src/index";
import { } from "jasmine";
import { delayMs } from './helpers';
import { AsyncContext } from "../src/api/common";

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
        expect(component.state.resultAsync).toBe(5);
        expect(counter).toBe(2);
    });

    it('Cancel', async () => {
        let counter = 0;

        const component = new TestDebounceComponent(17, 100, () => counter++);

        for (let i = 1; i <= 7; i++) {
            component.modifyState("arg", i);
            await delayMs(100);
            expect(component.state.result).toBe(100);
        }

        component.modifyState("arg", 17);

        await delayMs(300);

        expect(component.state.result).toBe(100);
        expect(component.state.resultAsync).toBe(100);
        expect(counter).toBe(0);
    });


    it('Async', async () => {
        let counter = {
            putAfter: 0,
            replace: 0,
            replaceCan: 0,
            cancel: 0,
            cancelCan: 0
        };

        const component = new TestAsyncDebounceComponent(17, 100, (type) => { counter[type]++; });

        for (let i = 1; i <= 7; i++) {
            component.modifyState("arg", i);
            await delayMs(10);
            //expect(component.state.result).toBe(100);
        }
        await component.whenAll();

        expect(component.state.resultPutAfter).toBe(108);// 1 + 7 the first and last
        expect(counter.putAfter).toBe(2);

        expect(component.state.resultReplace).toBe(107);// 7 the last
        expect(counter.replaceCan).toBe(7);
        expect(counter.replace).toBe(1);

        expect(component.state.resultCancel).toBe(101);// 1 the first
        expect(counter.cancelCan).toBe(1);
        expect(counter.cancel).toBe(1);
    });

});


class TestDebounceState {

    public readonly resultAsync: number;

    constructor(public readonly arg: number, public readonly result: number, private readonly _callback: () => void) {
        this.resultAsync = result;
    }

    @With("arg").Debounce(300)
    public static calcResultSync(state: TestDebounceState): Partial<TestDebounceState> {
        state._callback();
        return { result: state.result + state.arg };
    }

    @WithAsync("arg").Debounce(300)
    public static async calcResultAsync(context: AsyncContext<TestDebounceState>): Promise<Partial<TestDebounceState> | null>  {
        await delayMs(1);
        const state = context();
        state._callback();
        return { resultAsync: state.resultAsync + state.arg };
    }
}

class TestDebounceComponent extends WithStateBase<TestDebounceState> {
    constructor(arg: number, result: number, callback: () => void) {
        super(new TestDebounceState(arg, result, callback), null, null);
    }
}


class TestAsyncDebounceState {

    public readonly resultPutAfter: number;

    public readonly resultReplace: number;

    public readonly resultCancel: number;

    constructor(public readonly arg: number, result: number, private readonly _callback: (type: "putAfter" | "replaceCan" | "replace" | "cancelCan" | "cancel") => void) {
        this.resultPutAfter = result;
        this.resultReplace = result;
        this.resultCancel = result;
    }

    @WithAsync("arg").Debounce(5).OnConcurrentLaunchPutAfter()
    public static async calcResultPutAfter(context: AsyncContext<TestAsyncDebounceState>): Promise<Partial<TestAsyncDebounceState> | null> {
        const state = context();
        await delayMs(100);
        state._callback("putAfter");
        return { resultPutAfter: state.resultPutAfter + state.arg };
    }

    @WithAsync("arg").Debounce(5).OnConcurrentLaunchReplace()
    public static async calcResultReplace(context: AsyncContext<TestAsyncDebounceState>): Promise<Partial<TestAsyncDebounceState> | null> {
        const state = context();
        await delayMs(100);
        state._callback("replaceCan");
        if (context.isCancelled()) {
            return null;
        }
        state._callback("replace");
        return { resultReplace: state.resultReplace + state.arg };
    }

    @WithAsync("arg").Debounce(5).OnConcurrentLaunchCancel()
    public static async calcResultCancel(context: AsyncContext<TestAsyncDebounceState>): Promise<Partial<TestAsyncDebounceState> | null> {
        const state = context();
        await delayMs(100);
        state._callback("cancelCan");
        if (context.isCancelled()) {
            return null;
        }
        state._callback("cancel");
        return { resultCancel: state.resultCancel + state.arg };
    }
}

class TestAsyncDebounceComponent extends WithStateBase<TestAsyncDebounceState> {
    constructor(arg: number, result: number, callback: (type: "putAfter" | "replaceCan" | "replace" | "cancelCan" | "cancel") => void) {
        super(new TestAsyncDebounceState(arg, result, callback), null, null);
    }
}
