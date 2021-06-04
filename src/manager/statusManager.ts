import RedisClient from 'ioredis'
import { promisify } from 'util'
import { uniq } from 'lodash'
import { getLogger } from 'pomelo2-logger'
import { invokeCallback } from '../util/utils'

declare interface Application {
	get(key: string): any
	set(...args: any[]): any
}

enum STATE {
	ST_INITED = 0,
	ST_STARTED = 1,
	ST_CLOSED = 2,
}

const DEFALT_PREFIX = '#POMELO-STATUS:'

const logger = getLogger('statusplugin')

export class StatusManager {
	app: Application
	opts: any
	redis: RedisClient.Redis | undefined
	constructor(app: Application, opts: any) {
		this.app = app
		this.opts = opts
		if (!this.opts.prefix) {
			this.opts.prefix = DEFALT_PREFIX
		}
	}

	start(cb: (...args: any[]) => void) {
		this.redis = new RedisClient(this.opts)
		this.redis.on('error', function (err) {
			logger.error('redis connection has error', {
				pid: process.pid,
				message: err.message,
			})
		})
		this.redis.once('ready', cb)
	}

	stop(force: boolean, cb: Function) {
		if (this.redis) {
			this.redis.quit()
			this.redis = undefined
		}
		invokeCallback(cb)
	}

	async clean(cb: Function) {
		if (!this.redis) {
			return invokeCallback(cb, new Error('redis gone'))
		}

		this.redis.hkeys('onlines', (err, uids) => {
			if (err) {
				return invokeCallback(cb, err)
			}
			if (uids && uids.length > 0) {
				logger.warn('cleanup uids status', { uids })
				this.redis?.del(uids.concat(['onlines']), (err, replies) => {
					invokeCallback(cb, err, replies)
				})
			} else {
				invokeCallback(cb, null, 0)
			}
		})
	}

	async exists(uid: string) {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		return this.redis.exists(uid)
	}

	async add(uid: string, sid: string, frontendId: string) {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		logger.debug('add uid to status list', {
			uid,
			sid,
			frontendId,
		})
		await this.redis.hset('onlines', uid, frontendId)
		await this.redis.hset(uid, sid, frontendId)
	}

	async leave(uid: string, sid: string) {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		await this.redis.hdel(uid, sid)
		await this.redis.hdel('onlines', uid)
		logger.debug('delete uid from status list', { uid, sid })
	}

	async getSidsByUid(uid: string): Promise<{ [fronedId: string]: string[] }> {
		if (!this.redis) {
			throw new Error('redis gone')
		}

		const all = await this.redis.hgetall(uid)
		const kvs: { [fronedId: string]: string[] } = {}
		for (let i in all) {
			if (!kvs[all[i]]) {
				kvs[all[i]] = []
			}
			kvs[all[i]].push(i)
		}
		return kvs
	}

	async getFrontedIdsByUid(uid: string): Promise<string[]> {
		if (!this.redis) {
			throw new Error('redis gone')
		}

		const arrays = await this.redis.hvals(uid)
		if (arrays && arrays.length) {
			return uniq(arrays)
		}
		return []
	}

	async getUids() {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		return await this.redis.hkeys('onlines')
	}
}
