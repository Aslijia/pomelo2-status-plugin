

export function invokeCallback(cb: Function, ...args: any[]) {
    if (!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};


export function size(obj: object) {
    var count = 0;
    for (var i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
};
