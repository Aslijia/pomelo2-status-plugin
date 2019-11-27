
class CountDownLatch {
    count: number;
    cb: Function;
    constructor(count: number, cb: Function) {
        this.count = count;
        this.cb = cb;
    }

    done() {
        if (this.count <= 0) {
            throw new Error('illegal state.');
        }

        this.count--;
        if (this.count === 0) {
            this.cb();
        }
    }
}

export function createCountDownLatch(count: number, done: Function) {
    if (!count || count <= 0) {
        throw new Error('count should be positive.');
    }
    if (typeof done !== 'function') {
        throw new Error('cb should be a function.');
    }
    return new CountDownLatch(count, done);
}