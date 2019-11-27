
import { RedisClient, createClient } from "redis";
import { promisify } from "util";
import { uniq } from 'lodash';
import { invokeCallback } from "../util/utils";

declare interface Application {

}

enum STATE {
    ST_INITED = 0,
    ST_STARTED = 1,
    ST_CLOSED = 2
}

export class StatusManager {
    app: Application;
    opts: any;

    host: string;
    port: number;
    redis: RedisClient;

    prefix: string;
    constructor(app: Application, opts: any) {
        this.app = app;
        this.opts = opts;
        this.host = this.opts.host;
        this.port = this.opts.port;
        this.prefix = this.opts.prefix || 'POMELO:STATUS'
    }

    start(cb: (...args: any[]) => void) {
        this.redis = createClient(this.port, this.host, this.opts);
        if (this.opts.auth_pass) {
            this.redis.auth(this.opts.auth_pass);
        }
        this.redis.on("error", function (err) {
            console.error("[status-plugin][redis]" + err.stack);
        });
        this.redis.once('ready', cb);
    }

    stop(force: boolean, cb: Function) {
        if (this.redis) {
            this.redis.end();
            this.redis = null;
        }
        invokeCallback(cb);
    };

    clean(cb: Function) {
        var cmds = [];
        this.redis.keys(`${this.prefix}*`, (err: Error, list: string[]) => {
            if (!!err) {
                invokeCallback(cb, err);
                return;
            }
            for (var i = 0; i < list.length; i++) {
                cmds.push(['del', list[i]]);
            }

            this.redis.multi(cmds).exec(function (err, replies) {
                invokeCallback(cb, err, replies);
            });
        });
    };

    async exists(uid: string) {
        return promisify(this.redis.exists.bind(this.redis))(`${this.prefix}:${uid}`);
    }

    async add(uid: string, sid: string, frontendId: string) {
        return promisify(this.redis.hset.bind(this.redis))(`${this.prefix}:${uid}`, sid, frontendId);
    };

    async leave(uid: string, sid: string) {
        return promisify(this.redis.hdel.bind(this.redis))(`${this.prefix}:${uid}`, sid);
    }

    async getSidsByUid(uid: string): Promise<string[]> {
        return await promisify(this.redis.hkeys.bind(this.redis))(`${this.prefix}:${uid}`);
    };

    async getFrontedIdsByUid(uid: string): Promise<string[]> {
        const arrays = await promisify(this.redis.hvals.bind(this.redis))(`${this.prefix}:${uid}`);
        if (arrays && arrays.length) {
            return uniq(arrays);
        }
        return [];
    };
}