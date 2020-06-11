"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeCallback = void 0;
function invokeCallback(cb, ...args) {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}
exports.invokeCallback = invokeCallback;
;
