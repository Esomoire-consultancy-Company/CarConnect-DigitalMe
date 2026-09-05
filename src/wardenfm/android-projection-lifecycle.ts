import type { AndroidCarConnectionPort } from './android-connection'

export type AndroidAutoProjectionInitializer = (
	port: AndroidCarConnectionPort,
	onConnect: () => void,
	onDisconnect: () => void,
) => Promise<() => void>

export type AndroidAutoProjectionLifecycleCallbacks = {
	onConnect: () => void
	onDisconnect: () => void
	onFailure: () => void
}

export class AndroidAutoProjectionLifecycle {
	private generation = 0
	private cleanup: (() => void) | undefined

	public constructor(
		private readonly initialize: AndroidAutoProjectionInitializer,
	) {}

	public async replace(
		port: AndroidCarConnectionPort,
		callbacks: AndroidAutoProjectionLifecycleCallbacks,
	): Promise<void> {
		const generation = ++this.generation

		this.cleanup?.()
		this.cleanup = undefined
		callbacks.onDisconnect()

		try {
			const cleanup = await this.initialize(
				port,
				() => {
					if (generation === this.generation) callbacks.onConnect()
				},
				() => {
					if (generation === this.generation) callbacks.onDisconnect()
				},
			)

			if (generation !== this.generation) {
				cleanup()
				return
			}

			this.cleanup = cleanup
		} catch {
			if (generation === this.generation) callbacks.onFailure()
		}
	}

	public reset(onDisconnect: () => void): void {
		this.generation += 1
		this.cleanup?.()
		this.cleanup = undefined
		onDisconnect()
	}
}
