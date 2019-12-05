
import { RedisClient, createClient } from "redis";
import { promisify } from "util";
import { uniq } from 'lodash';
import { invokeCallback } from "../util/utils";

declare interface Application {
    get(key: string): any;
    set(...args: any[]): any;
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
    redis: RedisClient | undefined;

    prefix: string;
    constructor(app: Application, opts: any) {
        this.app = app;
        this.opts = opts;
        this.host = this.opts.host;
        this.port = this.opts.port;
        this.prefix = this.opts.prefix || '{POMELO:STATUS}.'
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
            this.redis = undefined;
        }
        invokeCallback(cb);
    };

    clean(cb: Function) {
        if (!this.redis) {
            return invokeCallback(cb, new Error('redis gone'));
        }

        const cmds: string[] = [];
        this.redis.keys(`*`, (err: Error | null, list: string[]) => {
            if (!!err || !this.redis) {
                invokeCallback(cb, err);
                return;
            }

            for (var i = 0; i < list.length; i++) {
                cmds.push(list[i].replace(this.prefix, ''));
            }
            if (cmds.length) {
                this.redis.del(cmds, function (err, replies) {
                    invokeCallback(cb, err, replies);
                });
            } else {
                invokeCallback(cb, null, 0);
            }
        });
    };

    async exists(uid: string) {
        if (!this.redis) {
            throw new Error('redis gone');
        }

        return promisify(this.redis.exists.bind(this.redis, uid))();
    }

    async add(uid: string, sid: string, frontendId: string) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        return promisify(this.redis.hset.bind(this.redis))(uid, sid, frontendId);
    };

    async leave(uid: string, sid: string) {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const hdel = promisify(this.redis.hdel.bind(this.redis));
        //@ts-ignore
        return await hdel(uid, sid);
    }

    async getSidsByUid(uid: string): Promise<{ [fronedId: string]: string[] }> {
        if (!this.redis) {
            throw new Error('redis gone');
        }
        const all = await promisify(this.redis.hgetall.bind(this.redis))(uid);
        const kvs: { [fronedId: string]: string[] } = {};
        for (let i in all) {
            if (!kvs[all[i]]) {
                kvs[all[i]] = [];
            }
            kvs[all[i]].push(i);
        }
        return kvs;
    };

    async getFrontedIdsByUid(uid: string): Promise<string[]> {
        if (!this.redis) {
            throw new Error('redis gone');
        }

        const arrays = await promisify(this.redis.hvals.bind(this.redis))(uid);
        if (arrays && arrays.length) {
            return uniq(arrays);
        }
        return [];
    };
}