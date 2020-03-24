"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const util_1 = require("util");
const lodash_1 = require("lodash");
const utils_1 = require("../util/utils");
var STATE;
(function (STATE) {
    STATE[STATE["ST_INITED"] = 0] = "ST_INITED";
    STATE[STATE["ST_STARTED"] = 1] = "ST_STARTED";
    STATE[STATE["ST_CLOSED"] = 2] = "ST_CLOSED";
})(STATE || (STATE = {}));
const DEFALT_PREFIX = '#POMELO-STATUS:';
class StatusManager {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts;
        if (!this.opts.prefix) {
            this.opts.prefix = DEFALT_PREFIX;
        }
    }
    start(cb) {
        this.redis = redis_1.createClient(this.opts);
        if (this.opts.auth_pass) {
            this.redis.auth(this.opts.auth_pass);
        }
        this.redis.on("error", function (err) {
            console.error("[status-plugin][redis]" + err.stack);
        });
        this.redis.once('ready', cb);
    }
    stop(force, cb) {
        if (this.redis) {
            this.redis.end();
            this.redis = undefined;
        }
        utils_1.invokeCallback(cb);
    }
    ;
    clean(cb) {
        if (!this.redis) {
            return utils_1.invokeCallback(cb, new Error('redis gone'));
        }
        const cmds = [];
        this.redis.keys(`${this.opts.prefix}*`, (err, list) => {
            if (!!err || !this.redis) {
                utils_1.invokeCallback(cb, err);
                return;
            }
            for (var i = 0; i < list.length; i++) {
                cmds.push(list[i].replace(this.opts.prefix, ''));
            }
            if (cmds.length) {
                this.redis.del(cmds, function (err, replies) {
                    utils_1.invokeCallback(cb, err, replies);
                });
            }
            else {
                utils_1.invokeCallback(cb, null, 0);
            }
        });
    }
    ;
    async exists(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return util_1.promisify(this.redis.exists.bind(this.redis, uid))();
    }
    async add(uid, sid, frontendId) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return util_1.promisify(this.redis.hset.bind(this.redis))(uid, sid, frontendId);
    }
    ;
    async leave(uid, sid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const hdel = util_1.promisify(this.redis.hdel.bind(this.redis));
        //@ts-ignore
        return await hdel(uid, sid);
    }
    async getSidsByUid(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const all = await util_1.promisify(this.redis.hgetall.bind(this.redis))(uid);
        const kvs = {};
        for (let i in all) {
            if (!kvs[all[i]]) {
                kvs[all[i]] = [];
            }
            kvs[all[i]].push(i);
        }
        return kvs;
    }
    ;
    async getFrontedIdsByUid(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const arrays = await util_1.promisify(this.redis.hvals.bind(this.redis))(uid);
        if (arrays && arrays.length) {
            return lodash_1.uniq(arrays);
        }
        return [];
    }
    ;
}
exports.StatusManager = StatusManager;
