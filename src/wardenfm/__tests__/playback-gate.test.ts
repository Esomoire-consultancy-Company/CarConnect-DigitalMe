import { WardenFmVehicleSession } from '../session'
import { createGovernedPlaybackHandlers } from '../playback-gate'

const connect = (session: WardenFmVehicleSession) =>
	session.connect('android-auto', [
		'audio_output',
		'play_pause',
		'next_previous',
		'microphone',
		'adb_execution',
	])

const makePlayer = () => {
	const calls: string[] = []
	let position = 0
	return {
		calls,
		setPosition(value: number) {
			position = value
		},
		port: {
			play: async () => {
				calls.push('play')
			},
			pause: async () => {
				calls.push('pause')
			},
			skipToNext: async () => {
				calls.push('next')
			},
			skipToPrevious: async () => {
				calls.push('previous')
			},
			seekTo: async (value: number) => {
				calls.push(`seek:${value}`)
			},
			getProgress: async () => ({ position }),
		},
	}
}

describe('createGovernedPlaybackHandlers', () => {
	it('blocks remote media effects before Warden admission', async () => {
		const session = new WardenFmVehicleSession()
		const player = makePlayer()
		const handlers = createGovernedPlaybackHandlers(session, player.port, 5)

		await handlers.play()
		await handlers.next()
		await handlers.seek(42)

		expect(player.calls).toEqual([])
	})

	it('executes admitted remote media effects', async () => {
		const session = new WardenFmVehicleSession()
		connect(session)
		const player = makePlayer()
		const handlers = createGovernedPlaybackHandlers(session, player.port, 5)

		await handlers.play()
		await handlers.pause()
		await handlers.next()
		await handlers.seek(42)

		expect(player.calls).toEqual(['play', 'pause', 'next', 'seek:42'])
	})

	it('preserves previous-track threshold semantics', async () => {
		const session = new WardenFmVehicleSession()
		connect(session)
		const player = makePlayer()
		const handlers = createGovernedPlaybackHandlers(session, player.port, 5)

		player.setPosition(2)
		await handlers.previous()
		player.setPosition(20)
		await handlers.previous()

		expect(player.calls).toEqual(['previous', 'seek:0'])
	})

	it('blocks effects again after disconnect', async () => {
		const session = new WardenFmVehicleSession()
		connect(session)
		const player = makePlayer()
		const handlers = createGovernedPlaybackHandlers(session, player.port, 5)

		session.disconnect()
		await handlers.next()

		expect(player.calls).toEqual([])
	})
})
