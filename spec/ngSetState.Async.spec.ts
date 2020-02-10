﻿import { WithStateBase, WithAsync, AsyncInit} from "../src/ngSetState";
import { } from "jasmine";
import { PromiseList, delayMs } from './helpers';

describe('Asynchronous tests: OnConcurrentLaunch...', () => {

    async function onConcurrentLaunchBody(expected: number, behaviour: string): Promise<any> {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestOnConcurrentLaunchComponent(() => promiseList.next());
        component.setMeta(behaviour);

        component.modifyState("arg", 1);
        component.modifyState("arg", 2);
        component.modifyState("arg", 3);


        await p3.resolve();

        await p1.resolve();

        await p2.resolve();

        await component.whenAll();

        expect(component.getResult()).toBe(expected);
    }

    it('OnConcurrentLaunchCancel()', async () => {
        await onConcurrentLaunchBody(1, "cancel");
    });

    it('OnConcurrentLaunchRace()', async () => {
        await onConcurrentLaunchBody(2, "concurrent");
    });

    it('OnConcurrentLaunchReplace()', async () => {
        await onConcurrentLaunchBody(3, "replace");
    });

    it('OnConcurrentLaunchPutAfter()', async () => {
        await onConcurrentLaunchBody(4, "putAfter");
    });
});

describe('Asynchronous tests: OnError...', () => {

    it('OnErrorCall()', async () => {
        const component = new TestOnErrorComponent(async () => {
            await delayMs(1);
            throw "Error18";
        });

        component.modifyState("argCall", 1);

        await component.whenAll();

        expect(component.state.error).toBe("Error18");
    });
    it('OnErrorForget()', async () => {
        const component = new TestOnErrorComponent(async () => {
            await delayMs(1);
            throw "Error18";
        });

        component.modifyState("error", "none");

        component.modifyState("argForget", 1);

        await component.whenAll();

        expect(component.state.error).toBe("none");
    });
    it('OnErrorThrow()', async () => {
        const component = new TestOnErrorComponent(async () => {
            await delayMs(1);
            throw "Error18";
        });

        component.modifyState("error", "none");

        component.modifyState("argThrow", 1);

        let error: any = null;

        try {
            await component.whenAll();
        }
        catch (e) {
            error = e;
        }

        expect(component.state.error).toBe("none");
        expect(error).toBe("Error18");
    });
    it('OnErrorThrow() (default)', async () => {
        const component = new TestOnErrorComponent(async () => {
            await delayMs(1);
            throw "Error18";
        });

        component.modifyState("error", "none");

        component.modifyState("argThrowDef", 1);

        let error: any = null;

        try {
            await component.whenAll();
        }
        catch (e) {
            error = e;
        }

        expect(component.state.error).toBe("none");
        expect(error).toBe("Error18");
    });
});


describe('Asynchronous tests: @AsyncInit', () => {

    it('@AsyncInit', async () => {
        const component = new TestAsyncInitComponent();

        expect(component.state.result).toBe(7);

        await delayMs(0);
        await component.whenAll();

        expect(component.state.result).toBe(10);
    });
});


describe('Asynchronous locks tests', () => {

    it('No Locks', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestLocksComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 1);
        component.modifyState("arg2", 2);
        component.modifyState("arg3", 3);

        expect(component.state.result).toBe(0);

        await p1.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(1);

        await p2.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(3);

        await p3.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(6);

    });

    it('Locks', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestLocksComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 1);
        component.modifyState("arg2", 2);
        component.modifyState("arg3", 3);

        expect(component.state.result).toBe(0);

        await p3.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(0);

        await p2.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(0);

        await p1.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(6);

    });

    it('Locks 2', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestLocksComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 1);
        component.modifyState("arg2", 2);
        component.modifyState("arg3", 3);

        expect(component.state.result).toBe(0);

        await p2.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(0);

        await p1.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(3);

        await p3.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(6);

    });

    it('Locks Parallel', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p4 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestLocksComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 1);
        component.modifyState("arg2", 2);
        component.modifyState("arg4", 4);

        await p4.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(4);

        await p2.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(4);

        component.modifyState("arg3", 3);

        await p1.resolve();
        await p3.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(10);

    });

    it('Locks 2 Keys', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p4 = promiseList.add();
        const p2 = promiseList.add();
        const p3 = promiseList.add();

        const component = new TestLocksComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 1);
        component.modifyState("arg2", 2);
        component.modifyState("arg3", 3);
        component.modifyState("arg4", 4);

        await p1.resolve();
        await p2.resolve();
        await p3.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(3);

        await p4.resolve();
        await delayMs(0);
        expect(component.state.result).toBe(10);
    });

    it('Async Init Locks', async () => {
        const promiseList = new PromiseList();

        const p1 = promiseList.add();
        const p2 = promiseList.add();

        const component = new TestLocksAsyncInitComponent(() => promiseList.next());

        await delayMs(0);

        component.modifyState("arg1", 7);

        await p2.resolve();
        await delayMs(0);

        expect(component.state.result).toBe(0);

        await p1.resolve();
        await delayMs(0);

        expect(component.state.result).toBe(17);
    });
});

class TestOnConcurrentLaunchComponent extends WithStateBase<TestOnConcurrentLaunchState> {
    constructor(operation: () => Promise<any>) {
        super(new TestOnConcurrentLaunchState(operation), null, null);
    }

    public getResult() { return this.state.result };

    public setMeta(behaviour: string) {
        this.state.constructor["__state_meta__"].modifiers[0].fun[0].asyncData.behaviourOnConcurrentLaunch = behaviour;
    }
}

class TestOnConcurrentLaunchState {

    public readonly arg: number = 0;
    public readonly result: number = 0;

    constructor(private readonly _operation: () => Promise<any>) { }

    @WithAsync("arg").OnConcurrentLaunchPutAfter()
    public static async calcResult(getCurrentSate: () => TestOnConcurrentLaunchState): Promise<Partial<TestOnConcurrentLaunchState>> {
        const state = getCurrentSate();
        await state._operation();
        return { result: state.result + state.arg };
    }
}

class TestOnErrorComponent extends WithStateBase<TestOnErrorState> {
    constructor(operation: () => Promise<any>) {
        super(new TestOnErrorState(operation), null, null);
    }

    public getResult() { return this.state.result };
}

class TestOnErrorState {

    public readonly argCall: number = 0;
    public readonly argForget: number = 0;
    public readonly argThrow: number = 0;
    public readonly argThrowDef: number = 0;
    public readonly error: any | null;
    public readonly result: number = 0;

    constructor(private readonly _operation: () => Promise<any>) { }

    @WithAsync("argCall").OnConcurrentLaunchPutAfter().OnErrorCall(TestOnErrorState.onError)
    public static async calcResultCall(getCurrentSate: () => TestOnErrorState): Promise<Partial<TestOnErrorState>> {
        const state = getCurrentSate();
        await state._operation();
        return { result: state.result + state.argCall };
    }

    @WithAsync("argForget").OnConcurrentLaunchPutAfter().OnErrorForget()
    public static async calcResultForget(getCurrentSate: () => TestOnErrorState): Promise<Partial<TestOnErrorState>> {
        const state = getCurrentSate();
        await state._operation();
        return { result: state.result + state.argForget };
    }

    @WithAsync("argThrow").OnConcurrentLaunchPutAfter().OnErrorThrow()
    public static async calcResultThrow(getCurrentSate: () => TestOnErrorState): Promise<Partial<TestOnErrorState>> {
        const state = getCurrentSate();
        await state._operation();
        return { result: state.result + state.argThrow };
    }

    @WithAsync("argThrowDef").OnConcurrentLaunchPutAfter()
    public static async calcResultThrowDef(getCurrentSate: () => TestOnErrorState): Promise<Partial<TestOnErrorState>> {
        const state = getCurrentSate();
        await state._operation();
        return { result: state.result + state.argThrow };
    }

    public static onError(current: TestOnErrorState, error: any): Partial<TestOnErrorState>|null {
        return { error: error };
    }
}

class TestAsyncInitComponent extends WithStateBase<TestAsyncInitState> {
    constructor() {
        super(new TestAsyncInitState(), null, null);
    }

    public getResult() { return this.state.result };
}

class TestAsyncInitState {

    public readonly result: number = 7;

    @AsyncInit()
    public static async calcResultCall(getCurrentSate: () => TestOnErrorState): Promise<Partial<TestAsyncInitState>> {
        const state = getCurrentSate();

        return { result: state.result + 3 };
    }
}

class TestLocksComponent extends WithStateBase<TestLocksState> {
    constructor(operation: () => Promise<any>) {
        super(new TestLocksState(operation), null, null);
    }

    public getResult() { return this.state.result };
}

class TestLocksState {

    public readonly result: number = 0;

    public readonly arg1: number = 0;
    public readonly arg2: number = 0;
    public readonly arg3: number = 0;
    public readonly arg4: number = 0;

    constructor(private readonly _operation: () => Promise<any>) { }

    @WithAsync("arg1").Locks("args")
    public static async withArg1(getCurrentState: () => TestLocksState): Promise<Partial<TestLocksState | null>> {
        const state = getCurrentState();

        await state._operation();

        return { result: getCurrentState().result + state.arg1 };
    }

    @WithAsync("arg2").Locks("args")
    public static async withArg2(getCurrentState: () => TestLocksState): Promise<Partial<TestLocksState | null>> {
        const state = getCurrentState();

        await state._operation();

        return { result: getCurrentState().result + state.arg2 };
    }

    @WithAsync("arg3").Locks("args", "arg4")
    public static async withArg3(getCurrentState: () => TestLocksState): Promise<Partial<TestLocksState | null>> {
        const state = getCurrentState();

        await state._operation();

        return { result: getCurrentState().result + state.arg3 };
    }

    @WithAsync("arg4").Locks("arg4")
    public static async withArg4(getCurrentState: () => TestLocksState): Promise<Partial<TestLocksState | null>> {

        const state = getCurrentState();

        await state._operation();
        return { result: getCurrentState().result + state.arg4 };
    }
}

class TestLocksAsyncInitComponent extends WithStateBase<TestLocksAsyncInitState> {
    constructor(operation: () => Promise<any>) {
        super(new TestLocksAsyncInitState(operation), null, null);
    }

    public getResult() { return this.state.result };
}

class TestLocksAsyncInitState {

    public readonly result: number = 0;

    public readonly arg1: number = 0;

    constructor(private readonly _operation: () => Promise<any>) { }

    @AsyncInit().Locks("in")
    public static async init(getCurrentState: () => TestLocksAsyncInitState): Promise<Partial<TestLocksState | null>> {

        await getCurrentState()._operation();

        return { result: 10 };
    }

    @WithAsync("arg1").Locks("in")
    public static async onArg1(getCurrentState: () => TestLocksAsyncInitState): Promise<Partial<TestLocksState | null>> {

        await getCurrentState()._operation();

        return { result: getCurrentState().result + getCurrentState().arg1 };
    }

}