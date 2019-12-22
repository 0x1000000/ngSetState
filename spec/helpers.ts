export class PromiseCompletionSource {

    private _promise: Promise<any> | null = null;

    private _resolver: ((result: any) => void) | null = null;

    private _readyValue: any[] | null;

    private _readyReason: any[] | null;

    private _rejecter: ((reason: any) => void) | null = null;

    public start(): Promise<any> {
        if (this._promise != null) {
            throw new Error("Promise already started");
        }

        this._promise = new Promise<any>(
            (resolver, rejecter) => {
                this._resolver = resolver;
                this._rejecter = rejecter;
            }
        );

        if (this._readyValue != null) {
            if (this._resolver == null) throw new Error("Resolver should be initialed");
            this._resolver(this._readyValue[0]);
        }
        if (this._readyReason != null) {
            if (this._rejecter == null) throw new Error("Rejecter  should be initialed");
            this._rejecter(this._readyReason[0]);
        }

        return this._promise;
    }

    public async resolve(value?: any) {
        if (this._readyValue != null) {
            throw new Error("Already resolved");
        }
        if (this._readyReason != null) {
            throw new Error("Already rejected");
        }
        this._readyValue = [value];
        await delayMs(0);
        if (this._resolver != null) {
            this._resolver(value);
        }
    }

    public async reject(reason?: any) {
        if (this._readyValue != null) {
            throw new Error("Already resolved");
        }
        if (this._readyReason != null) {
            throw new Error("Already rejected");
        }
        this._readyReason = [reason];
        await delayMs(0);
        if (this._rejecter != null) {
            this._rejecter(reason);
        }
    }
}


export class PromiseList {
    private readonly _promises: PromiseCompletionSource[] = [];
    private _index: number = 0;

    public add(): PromiseCompletionSource {

        const result = new PromiseCompletionSource();
        this._promises.push(result);
        return result;
    }

    public next(): Promise<any> {
        if (this._index >= this._promises.length) {
            throw new Error("Promise list is over");
        }
        return this._promises[this._index++].start();
    }
}

export function delayMs(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs));
}