"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CountDownLatch {
    constructor(count, cb) {
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
function createCountDownLatch(count, done) {
    if (!count || count <= 0) {
        throw new Error('count should be positive.');
    }
    if (typeof done !== 'function') {
        throw new Error('cb should be a function.');
    }
    return new CountDownLatch(count, done);
}
exports.createCountDownLatch = createCountDownLatch;
