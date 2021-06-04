"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const lodash_1 = require("lodash");
const pomelo2_logger_1 = require("pomelo2-logger");
const utils_1 = require("../util/utils");
var STATE;
(function (STATE) {
    STATE[STATE["ST_INITED"] = 0] = "ST_INITED";
    STATE[STATE["ST_STARTED"] = 1] = "ST_STARTED";
    STATE[STATE["ST_CLOSED"] = 2] = "ST_CLOSED";
})(STATE || (STATE = {}));
const DEFALT_PREFIX = '#POMELO-STATUS:';
const logger = pomelo2_logger_1.getLogger('statusplugin');
class StatusManager {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts;
        if (!this.opts.options) {
            this.opts.options = {};
        }
        if (!this.opts.options.prefix) {
            this.opts.prefix = DEFALT_PREFIX;
        }
    }
    start(cb) {
        this.redis = new ioredis_1.default(this.opts.url, this.opts.options);
        this.redis.on('error', function (err) {
            logger.error('redis connection has error', {
                pid: process.pid,
                message: err.message,
            });
        });
        this.redis.on('ready', () => {
            logger.debug('redis ready', { pid: process.pid });
            utils_1.invokeCallback(cb);
        });
    }
    stop(force, cb) {
        if (this.redis) {
            this.redis.quit();
            this.redis = undefined;
        }
        utils_1.invokeCallback(cb);
    }
    async clean(cb) {
        if (!this.redis) {
            return utils_1.invokeCallback(cb, new Error('redis gone'));
        }
        this.redis.hkeys('onlines', (err, uids) => {
            var _a;
            if (err) {
                return utils_1.invokeCallback(cb, err);
            }
            if (uids && uids.length > 0) {
                logger.warn('cleanup uids status', { uids });
                (_a = this.redis) === null || _a === void 0 ? void 0 : _a.del(uids.concat(['onlines']), (err, replies) => {
                    utils_1.invokeCallback(cb, err, replies);
                });
            }
            else {
                utils_1.invokeCallback(cb, null, 0);
            }
        });
    }
    async exists(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return this.redis.exists(uid);
    }
    async add(uid, sid, frontendId) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        logger.debug('add uid to status list', {
            uid,
            sid,
            frontendId,
        });
        await this.redis.hset('onlines', uid, frontendId);
        await this.redis.hset(uid, sid, frontendId);
    }
    async leave(uid, sid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        await this.redis.hdel(uid, sid);
        await this.redis.hdel('onlines', uid);
        logger.debug('delete uid from status list', { uid, sid });
    }
    async getSidsByUid(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const all = await this.redis.hgetall(uid);
        const kvs = {};
        for (let i in all) {
            if (!kvs[all[i]]) {
                kvs[all[i]] = [];
            }
            kvs[all[i]].push(i);
        }
        return kvs;
    }
    async getFrontedIdsByUid(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const arrays = await this.redis.hvals(uid);
        if (arrays && arrays.length) {
            return lodash_1.uniq(arrays);
        }
        return [];
    }
    async getUids() {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return await this.redis.hkeys('onlines');
    }
}
exports.StatusManager = StatusManager;
