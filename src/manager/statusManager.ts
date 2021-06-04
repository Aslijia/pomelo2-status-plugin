import IORedis from 'ioredis'
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
	redis: IORedis.Redis | undefined
	constructor(app: Application, opts: any) {
		this.app = app
		this.opts = opts

		if (!this.opts.options) {
			this.opts.options = { prefix: DEFALT_PREFIX }
		}
	}

	start(cb: (...args: any[]) => void) {
		this.redis = new IORedis(this.opts.url, this.opts.options)
		this.redis.on('error', function (err) {
			logger.error('redis connection has error', {
				pid: process.pid,
				message: err.message,
			})
		})

		this.redis.on('ready', () => {
			logger.debug('redis ready', {
				pid: process.pid,
				url: this.opts.url,
				options: this.opts.options,
			})
			invokeCallback(cb)
		})
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

		const uids = await this.redis.hkeys('onlines')
		await this.redis.del('onlines')
		if (uids && uids.length) {
			await this.redis.del(...uids)
		}
		invokeCallback(cb)
	}

	async exists(uid: string | number) {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		return await this.redis.exists(uid.toString())
	}

	async add(uid: string | number, sid: string, frontendId: string) {
		if (!this.redis) {
			throw new Error('redis gone')
		}
		await this.redis.hset('onlines', uid.toString(), frontendId)
		await this.redis.hset(uid.toString(), sid, frontendId)
		logger.debug('add uid to status list', { uid, sid, frontendId })
	}

	async leave(uid: string | number, sid: string) {
		if (!this.redis) {
			throw new Error('redis gone')
		}

		await this.redis.hdel(uid.toString(), sid)
		await this.redis.hdel('onlines', uid.toString())
		logger.debug('delete uid from status list', { uid, sid })
	}

	async getSidsByUid(
		uid: string | number
	): Promise<{ [fronedId: string]: string[] }> {
		if (!this.redis) {
			throw new Error('redis gone')
		}

		const all = await this.redis.hgetall(uid.toString())
		const kvs: { [fronedId: string]: string[] } = {}
		for (let i in all) {
			if (!kvs[all[i]]) {
				kvs[all[i]] = []
			}
			kvs[all[i]].push(i)
		}
		return kvs
	}

	async getFrontedIdsByUid(uid: string | number): Promise<string[]> {
		if (!this.redis) {
			throw new Error('redis gone')
		}

		const arrays = await this.redis.hvals(uid.toString())
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
