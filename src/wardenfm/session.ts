export type WardenFmCapability =
	| 'audio_output'
	| 'play_pause'
	| 'next_previous'
	| 'microphone'
	| 'adb_execution'

export type WardenFmTransport = 'android-auto' | 'carplay' | 'bluetooth' | 'autolink'
export type WardenFmMediaCommand = 'play' | 'pause' | 'next' | 'previous' | 'seek'
export type WardenFmSessionState = 'idle' | 'active' | 'closed'
export type WardenFmDecision = 'allow' | 'deny'

export type WardenFmEventType =
	| 'VEHICLE_TRANSPORT_DISCOVERED'
	| 'WARDEN_CAPABILITY_REQUESTED'
	| 'WARDEN_CAPABILITY_DECIDED'
	| 'VEHICLE_CONNECTOR_SESSION_STARTED'
	| 'MEDIA_COMMAND_RECEIVED'
	| 'VEHICLE_CONNECTOR_SESSION_ENDED'

export interface WardenFmEventPayload {
	transport?: WardenFmTransport
	capabilities?: WardenFmCapability[]
	decisions?: Partial<Record<WardenFmCapability, WardenFmDecision>>
	command?: WardenFmMediaCommand
	capability?: WardenFmCapability
}

export interface WardenFmEvent {
	id: string
	at: string
	type: WardenFmEventType
	payload: WardenFmEventPayload
}

export interface WardenFmVehicleSessionDependencies {
	now?: () => string
	idFactory?: () => string
}

const decisionFor = (capability: WardenFmCapability): WardenFmDecision => {
	if (
		capability === 'audio_output' ||
		capability === 'play_pause' ||
		capability === 'next_previous'
	) {
		return 'allow'
	}
	return 'deny'
}

const capabilityForCommand = (
	command: WardenFmMediaCommand,
): WardenFmCapability | undefined => {
	switch (command) {
		case 'next':
		case 'previous':
			return 'next_previous'
		case 'play':
		case 'pause':
		case 'seek':
			return 'play_pause'
		default:
			return undefined
	}
}

const cloneEvent = (event: WardenFmEvent): WardenFmEvent => ({
	...event,
	payload: {
		...event.payload,
		capabilities: event.payload.capabilities
			? [...event.payload.capabilities]
			: undefined,
		decisions: event.payload.decisions
			? { ...event.payload.decisions }
			: undefined,
	},
})

export class WardenFmVehicleSession {
	private sessionState: WardenFmSessionState = 'idle'
	private readonly eventLog: WardenFmEvent[] = []
	private readonly decisions = new Map<WardenFmCapability, WardenFmDecision>()
	private readonly now: () => string
	private readonly idFactory: () => string

	public constructor(dependencies: WardenFmVehicleSessionDependencies = {}) {
		this.now = dependencies.now ?? (() => new Date().toISOString())
		this.idFactory =
			dependencies.idFactory ?? (() => `${Date.now()}-${this.eventLog.length + 1}`)
	}

	public get state(): WardenFmSessionState {
		return this.sessionState
	}

	public get events(): readonly WardenFmEvent[] {
		return this.eventLog.map(cloneEvent)
	}

	public connect(transport: WardenFmTransport, capabilities: WardenFmCapability[]): void {
		if (this.sessionState === 'active') this.disconnect()

		this.decisions.clear()
		const decisions: Partial<Record<WardenFmCapability, WardenFmDecision>> = {}
		for (const capability of capabilities) {
			const decision = decisionFor(capability)
			this.decisions.set(capability, decision)
			decisions[capability] = decision
		}

		this.append('VEHICLE_TRANSPORT_DISCOVERED', { transport })
		this.append('WARDEN_CAPABILITY_REQUESTED', { capabilities: [...capabilities] })
		this.append('WARDEN_CAPABILITY_DECIDED', { decisions })
		this.sessionState = 'active'
		this.append('VEHICLE_CONNECTOR_SESSION_STARTED', { transport })
	}

	public disconnect(): void {
		if (this.sessionState !== 'active') return
		this.sessionState = 'closed'
		this.decisions.clear()
		this.append('VEHICLE_CONNECTOR_SESSION_ENDED', {})
	}

	public canExecute(capability: WardenFmCapability): boolean {
		if (this.sessionState !== 'active') return false
		if (capability === 'adb_execution') return false
		return this.decisions.get(capability) === 'allow'
	}

	public authorizeMediaCommand(command: WardenFmMediaCommand): boolean {
		const capability = capabilityForCommand(command)
		if (!capability || !this.canExecute(capability)) return false
		this.append('MEDIA_COMMAND_RECEIVED', { command, capability })
		return true
	}

	private append(type: WardenFmEventType, payload: WardenFmEventPayload): void {
		this.eventLog.push({
			id: this.idFactory(),
			at: this.now(),
			type,
			payload,
		})
	}
}
