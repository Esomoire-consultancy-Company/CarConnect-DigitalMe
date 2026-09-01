import {
	initializeAndroidAutoProjection,
	registerAndroidAutoProjection,
} from '../android-connection'

type Listener = (type: number) => void

const makePort = (initial: number) => {
	let listener: Listener | undefined
	let removed = false
	return {
		port: {
			getConnectionType: async () => initial,
			subscribe: (cb: Listener) => {
				listener = cb
				return () => {
					removed = true
				}
			},
		},
		emit: (value: number) => listener?.(value),
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
})
