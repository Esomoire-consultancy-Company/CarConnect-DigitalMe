import { AndroidAutoProjectionLifecycle } from '../android-projection-lifecycle'
import type { AndroidCarConnectionPort } from '../android-connection'

const port = {} as AndroidCarConnectionPort

describe('AndroidAutoProjectionLifecycle', () => {
	it('closes the previous Warden session before replacing an observer', async () => {
		const calls: string[] = []
		const cleanups: Array<() => void> = []
		const lifecycle = new AndroidAutoProjectionLifecycle(async () => {
			const cleanup = () => calls.push('cleanup')
			cleanups.push(cleanup)
			return cleanup
		})

		await lifecycle.replace(port, {
			onConnect: () => calls.push('connect-1'),
			onDisconnect: () => calls.push('disconnect-1'),
			onFailure: () => calls.push('fail-1'),
		})
		calls.length = 0

		await lifecycle.replace(port, {
			onConnect: () => calls.push('connect-2'),
			onDisconnect: () => calls.push('disconnect-2'),
			onFailure: () => calls.push('fail-2'),
		})

		expect(calls.slice(0, 2)).toEqual(['cleanup', 'disconnect-2'])
		expect(cleanups).toHaveLength(2)
	})

	it('invalidates and disposes a stale initialization that resolves after a newer one', async () => {
		const calls: string[] = []
		let resolveFirst: ((cleanup: () => void) => void) | undefined
		let resolveSecond: ((cleanup: () => void) => void) | undefined
		let firstConnect: (() => void) | undefined
		let secondConnect: (() => void) | undefined
		let attempt = 0
		const lifecycle = new AndroidAutoProjectionLifecycle(
			async (_port, onConnect) => {
				attempt += 1
				if (attempt === 1) {
					firstConnect = onConnect
					return new Promise<() => void>((resolve) => {
						resolveFirst = resolve
					})
				}
				secondConnect = onConnect
				return new Promise<() => void>((resolve) => {
					resolveSecond = resolve
				})
			},
		)

		const first = lifecycle.replace(port, {
			onConnect: () => calls.push('connect-1'),
			onDisconnect: () => calls.push('disconnect-1'),
			onFailure: () => calls.push('fail-1'),
		})
		const second = lifecycle.replace(port, {
			onConnect: () => calls.push('connect-2'),
			onDisconnect: () => calls.push('disconnect-2'),
			onFailure: () => calls.push('fail-2'),
		})

		firstConnect?.()
		secondConnect?.()
		expect(calls).toEqual(['disconnect-1', 'disconnect-2', 'connect-2'])

		resolveSecond?.(() => calls.push('cleanup-2'))
		await second
		resolveFirst?.(() => calls.push('cleanup-1'))
		await first

		expect(calls).toContain('cleanup-1')
		expect(calls).not.toContain('connect-1')
	})

	it('fails closed only for the current initialization attempt', async () => {
		const calls: string[] = []
		let rejectFirst: ((reason?: unknown) => void) | undefined
		let resolveSecond: ((cleanup: () => void) => void) | undefined
		let attempt = 0
		const lifecycle = new AndroidAutoProjectionLifecycle(async () => {
			attempt += 1
			if (attempt === 1) {
				return new Promise<() => void>((_resolve, reject) => {
					rejectFirst = reject
				})
			}
			return new Promise<() => void>((resolve) => {
				resolveSecond = resolve
			})
		})

		const first = lifecycle.replace(port, {
			onConnect: () => undefined,
			onDisconnect: () => calls.push('disconnect-1'),
			onFailure: () => calls.push('fail-1'),
		})
		const second = lifecycle.replace(port, {
			onConnect: () => undefined,
			onDisconnect: () => calls.push('disconnect-2'),
			onFailure: () => calls.push('fail-2'),
		})

		rejectFirst?.(new Error('stale'))
		await first
		resolveSecond?.(() => undefined)
		await second

		expect(calls).not.toContain('fail-1')
		expect(calls).not.toContain('fail-2')
	})
})
