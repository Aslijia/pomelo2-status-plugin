import { StatusManager } from '../manager/statusManager'
import { invokeCallback } from '../util/utils'
import { promisify } from 'util'

declare interface Application {
	get(key: string): any
	set(...args: any[]): any
}

enum STATE {
	ST_INITED = 0,
	ST_STARTED = 1,
	ST_CLOSED = 2,
}

export class StatusService {
	app: Application
	opts: any
	state: STATE
	cleanOnStartUp: boolean
	manager: StatusManager
	constructor(app: Application, opts: any) {
		this.app = app
		this.opts = opts
		this.cleanOnStartUp = this.opts.cleanOnStartUp

		this.state = STATE.ST_INITED
		if (opts.stateManager) {
			this.manager = opts.stateManager
		} else {
			this.manager = new StatusManager(app, opts)
		}
	}

	start(cb: Function) {
		if (this.state !== STATE.ST_INITED) {
			invokeCallback(cb, new Error('invalid state'))
			return
		}

		if (typeof this.manager.start === 'function') {
			var self = this
			this.manager.start(function (err) {
				if (!err) {
					self.state = STATE.ST_STARTED
				}
				if (!!self.cleanOnStartUp) {
					self.manager.clean(function (err: Error) {
						invokeCallback(cb, err)
					})
				} else {
					invokeCallback(cb, err)
				}
			})
		} else {
			process.nextTick(function () {
				invokeCallback(cb)
			})
		}
	}

	stop(force: boolean, cb: Function) {
		this.state = STATE.ST_CLOSED

		if (typeof this.manager.stop === 'function') {
			this.manager.stop(force, cb)
		} else {
			process.nextTick(function () {
				invokeCallback(cb)
			})
		}
	}

	async add(uid: string, sid: string, frontedId: string) {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}
		return this.manager.add(uid, sid, frontedId)
	}

	async leave(uid: string, sid: string) {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}

		this.manager.leave(uid, sid)
	}

	async getSidsByUid(uid: string) {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}

		return await this.manager.getSidsByUid(uid)
	}

	async getFrontendIdsByUid(uid: string) {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}

		return await this.manager.getFrontedIdsByUid(uid)
	}

	async getStatusByUid(uid: string): Promise<boolean> {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}
		return !!(await this.manager.exists(uid))
	}

	async pushByUids(uids: string[], route: string, msg: any) {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}

		const channelService = this.app.get('channelService')

		for (let i in uids) {
			const frontendIds = await this.manager.getFrontedIdsByUid(uids[i])
			const records = []
			for (let j in frontendIds) {
				records.push({ uid: uids[i], sid: frontendIds[j] })
			}
			if (records.length) {
				await promisify(
					channelService.pushMessageByUids.bind(channelService)
				)(route, msg, records)
			}
		}
	}

	async getUids() {
		if (this.state !== STATE.ST_STARTED) {
			throw new Error('invalid state')
		}
		return await this.manager.getUids()
	}
}
