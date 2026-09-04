import {
	WardenFmVehicleSession,
	type WardenFmCapability,
} from '../session'

describe('WardenFmVehicleSession', () => {
	const capabilities: WardenFmCapability[] = [
		'audio_output',
		'play_pause',
		'next_previous',
		'microphone',
		'adb_execution',
	]

	const createSession = () => {
		let id = 0
		return new WardenFmVehicleSession({
			now: () => '2026-09-02T03:00:00+05:30',
			idFactory: () => `evt-${++id}`,
		})
	}

	it('admits bounded media capabilities and hard-denies ADB', () => {
		const session = createSession()

		session.connect('android-auto', capabilities)

		expect(session.state).toBe('active')
		expect(session.canExecute('audio_output')).toBe(true)
		expect(session.canExecute('play_pause')).toBe(true)
		expect(session.canExecute('next_previous')).toBe(true)
		expect(session.canExecute('microphone')).toBe(false)
		expect(session.canExecute('adb_execution')).toBe(false)
	})

	it('records append-only governed connection evidence', () => {
		const session = createSession()

		session.connect('android-auto', capabilities)
		const connectionEvents = session.events

		expect(connectionEvents.map((event) => event.type)).toEqual([
			'VEHICLE_TRANSPORT_DISCOVERED',
			'WARDEN_CAPABILITY_REQUESTED',
			'WARDEN_CAPABILITY_DECIDED',
			'VEHICLE_CONNECTOR_SESSION_STARTED',
		])
		expect(connectionEvents[2].payload.decisions).toEqual({
			audio_output: 'allow',
			play_pause: 'allow',
			next_previous: 'allow',
			microphone: 'deny',
			adb_execution: 'deny',
		})

		session.disconnect()
		expect(session.events.slice(0, connectionEvents.length)).toEqual(connectionEvents)
	})

	it('does not expose mutable session state or evidence backing storage', () => {
		const session = createSession()
		session.connect('android-auto', capabilities)
		const eventCount = session.events.length

		expect(() => {
			;(session as unknown as { state: string }).state = 'closed'
		}).toThrow()
		;(session.events as WardenFmCapability[]).length = 0

		expect(session.state).toBe('active')
		expect(session.events).toHaveLength(eventCount)
	})

	it('requires an active vehicle session before authorizing a vehicle command', () => {
		const session = createSession()

		expect(session.authorizeMediaCommand('next')).toBe(false)

		session.connect('android-auto', capabilities)
		expect(session.authorizeMediaCommand('next')).toBe(true)

		session.disconnect()
		expect(session.authorizeMediaCommand('next')).toBe(false)
		expect(session.state).toBe('closed')
	})

	it('denies next when the active session lacks next_previous', () => {
		const session = createSession()
		session.connect('android-auto', ['play_pause'])

		expect(session.authorizeMediaCommand('next')).toBe(false)
	})

	it('replaces active permissions when a fail-closed session is applied', () => {
		const session = createSession()
		session.connect('android-auto', capabilities)
		expect(session.authorizeMediaCommand('next')).toBe(true)

		session.connect('android-auto', [])

		expect(session.state).toBe('active')
		expect(session.authorizeMediaCommand('next')).toBe(false)
	})

	it('denies unsupported runtime commands instead of mapping them to playback', () => {
		const session = createSession()
		session.connect('android-auto', capabilities)

		expect(
			session.authorizeMediaCommand('unsupported' as never),
		).toBe(false)
	})

	it('never permits ADB even if it is requested explicitly', () => {
		const session = createSession()

		session.connect('android-auto', ['adb_execution'])

		expect(session.canExecute('adb_execution')).toBe(false)
		expect(
			session.events.some(
				(event) =>
					event.type === 'WARDEN_CAPABILITY_DECIDED' &&
					event.payload.decisions?.adb_execution === 'deny',
			),
		).toBe(true)
	})
})
