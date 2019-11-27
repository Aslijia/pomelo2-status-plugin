"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const statusManager_1 = require("../manager/statusManager");
const utils_1 = require("../util/utils");
const util_1 = require("util");
var STATE;
(function (STATE) {
    STATE[STATE["ST_INITED"] = 0] = "ST_INITED";
    STATE[STATE["ST_STARTED"] = 1] = "ST_STARTED";
    STATE[STATE["ST_CLOSED"] = 2] = "ST_CLOSED";
})(STATE || (STATE = {}));
class StatusService {
    constructor(app, opts) {
        this.app = app;
        this.opts = opts;
        this.cleanOnStartUp = this.opts.cleanOnStartUp;
        this.state = STATE.ST_INITED;
        if (opts.stateManager) {
            this.manager = opts.stateManager;
        }
        else {
            this.manager = new statusManager_1.StatusManager(app, opts);
        }
    }
    start(cb) {
        if (this.state !== STATE.ST_INITED) {
            utils_1.invokeCallback(cb, new Error('invalid state'));
            return;
        }
        if (typeof this.manager.start === 'function') {
            var self = this;
            this.manager.start(function (err) {
                if (!err) {
                    self.state = STATE.ST_STARTED;
                }
                if (!!self.cleanOnStartUp) {
                    self.manager.clean(function (err) {
                        utils_1.invokeCallback(cb, err);
                    });
                }
                else {
                    utils_1.invokeCallback(cb, err);
                }
            });
        }
        else {
            process.nextTick(function () {
                utils_1.invokeCallback(cb);
            });
        }
    }
    ;
    stop(force, cb) {
        this.state = STATE.ST_CLOSED;
        if (typeof this.manager.stop === 'function') {
            this.manager.stop(force, cb);
        }
        else {
            process.nextTick(function () {
                utils_1.invokeCallback(cb);
            });
        }
    }
    ;
    async add(uid, sid, frontedId) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        return this.manager.add(uid, sid, frontedId);
    }
    ;
    async leave(uid, sid) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        this.manager.leave(uid, sid);
    }
    ;
    async getSidsByUid(uid) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        return await this.manager.getSidsByUid(uid);
    }
    ;
    async getFrontendIdsByUid(uid) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        return await this.manager.getFrontedIdsByUid(uid);
    }
    async getStatusByUid(uid) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        return !!await this.manager.exists(uid);
    }
    async pushByUids(uids, route, msg) {
        if (this.state !== STATE.ST_STARTED) {
            throw new Error('invalid state');
        }
        const channelService = this.app.get('channelService');
        for (let i in uids) {
            const frontendIds = await this.manager.getFrontedIdsByUid(uids[i]);
            const records = [];
            for (let j in frontendIds) {
                records.push({ uid: uids[i], sid: frontendIds[j] });
            }
            if (records.length) {
                await util_1.promisify(channelService.pushMessageByUids.bind(channelService))(route, msg, records);
            }
        }
    }
    ;
}
exports.StatusService = StatusService;
