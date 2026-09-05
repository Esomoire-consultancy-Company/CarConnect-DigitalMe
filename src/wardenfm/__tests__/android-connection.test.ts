import {
	initializeAndroidAutoProjection,
	registerAndroidAutoProjection,
} from '../android-connection'

type Listener = (type: number) => void

const makePort = (initial: number) => {
	let current = initial
	let listener: Listener | undefined
	let removed = false
	return {
		port: {
			getConnectionType: async () => current,
			subscribe: (cb: Listener) => {
				listener = cb
				return () => {
					removed = true
				}
			},
		},
		emit: (value: number) => {
			current = value
			listener?.(value)
		},
		wasRemoved: () => removed,
	}
}

describe('Android Auto projection observation', () => {
	it('opens only when Android Auto projection is observed', async () => {
		const source = makePort(0)
		const events: string[] = []
		const cleanup = registerAndroidAutoProjection(
			source.port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)

		await Promise.resolve()
		await Promise.resolve()
		expect(events).toEqual([])

		source.emit(2)
		source.emit(2)
		expect(events).toEqual(['connect'])
		cleanup()
	})

	it('closes when projection ends', async () => {
		const source = makePort(2)
		const events: string[] = []
		const cleanup = registerAndroidAutoProjection(
			source.port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)

		await Promise.resolve()
		await Promise.resolve()
		expect(events).toEqual(['connect'])

		source.emit(0)
		source.emit(0)
		expect(events).toEqual(['connect', 'disconnect'])
		cleanup()
	})

	it('treats native Automotive as not Android Auto projection', async () => {
		const source = makePort(1)
		const events: string[] = []
		const cleanup = registerAndroidAutoProjection(
			source.port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)

		await Promise.resolve()
		await Promise.resolve()
		expect(events).toEqual([])

		cleanup()
		expect(source.wasRemoved()).toBe(true)
	})

	it('establishes headless projection state before returning', async () => {
		const source = makePort(2)
		const events: string[] = []
		const cleanup = await initializeAndroidAutoProjection(
			source.port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)

		expect(events).toEqual(['connect'])
		source.emit(0)
		expect(events).toEqual(['connect', 'disconnect'])
		cleanup()
	})

	it('cleans the observer when the initial headless query rejects', async () => {
		let listener: Listener | undefined
		let removed = false
		const events: string[] = []
		const port = {
			getConnectionType: async () => {
				throw new Error('connection query failed')
			},
			subscribe: (cb: Listener) => {
				listener = cb
				return () => {
					removed = true
				}
			},
		}

		await expect(
			initializeAndroidAutoProjection(
				port,
				() => events.push('connect'),
				() => events.push('disconnect'),
			),
		).rejects.toThrow('connection query failed')

		expect(removed).toBe(true)
		listener?.(2)
		expect(events).toEqual([])
	})

	it('fails closed and unsubscribes when the UI initial query rejects', async () => {
		let removed = false
		const events: string[] = []
		const port = {
			getConnectionType: async () => {
				throw new Error('connection query failed')
			},
			subscribe: (_cb: Listener) => () => {
				removed = true
			},
		}

		const cleanup = registerAndroidAutoProjection(
			port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)
		await Promise.resolve()
		await Promise.resolve()

		expect(removed).toBe(true)
		expect(events).toEqual(['disconnect'])
		cleanup()
	})

	it('keeps a live projection update when the initial snapshot resolves stale', async () => {
		let listener: Listener | undefined
		let resolveInitial: ((value: number) => void) | undefined
		const events: string[] = []
		const port = {
			getConnectionType: () =>
				new Promise<number>((resolve) => {
					resolveInitial = resolve
				}),
			subscribe: (cb: Listener) => {
				listener = cb
				return () => undefined
			},
		}

		const initialization = initializeAndroidAutoProjection(
			port,
			() => events.push('connect'),
			() => events.push('disconnect'),
		)
		listener?.(2)
		resolveInitial?.(0)
		await initialization

		expect(events).toEqual(['connect'])
	})
})
