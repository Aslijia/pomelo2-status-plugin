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
            this.opts.options = { keyPrefix: DEFALT_PREFIX };
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
            logger.debug('redis ready', {
                pid: process.pid,
                url: this.opts.url,
                options: this.opts.options,
            });
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
        const uids = await this.redis.hkeys('onlines');
        await this.redis.del('onlines');
        if (uids && uids.length) {
            await this.redis.del(...uids);
        }
        utils_1.invokeCallback(cb);
    }
    async exists(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return await this.redis.exists(uid.toString());
    }
    async add(uid, sid, frontendId) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        await this.redis.hset('onlines', uid.toString(), frontendId);
        await this.redis.hset(uid.toString(), sid, frontendId);
        logger.debug('add uid to status list', { uid, sid, frontendId });
    }
    async leave(uid, sid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        await this.redis.hdel(uid.toString(), sid);
        await this.redis.hdel('onlines', uid.toString());
        logger.debug('delete uid from status list', { uid, sid });
    }
    async getSidsByUid(uid) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const all = await this.redis.hgetall(uid.toString());
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
        const arrays = await this.redis.hvals(uid.toString());
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
