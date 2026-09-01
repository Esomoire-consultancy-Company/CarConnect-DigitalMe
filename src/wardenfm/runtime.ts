import {
	WardenFmVehicleSession,
	type WardenFmCapability,
	type WardenFmTransport,
} from './session'

export const WARDENFM_STANDARD_CAPABILITIES: WardenFmCapability[] = [
	'audio_output',
	'play_pause',
	'next_previous',
	'microphone',
	'adb_execution',
]

export const wardenFmVehicleSession = new WardenFmVehicleSession()

export function connectWardenFmVehicle(transport: WardenFmTransport): void {
	wardenFmVehicleSession.connect(transport, WARDENFM_STANDARD_CAPABILITIES)
}

export function failClosedWardenFmVehicle(transport: WardenFmTransport): void {
	wardenFmVehicleSession.connect(transport, [])
}

export function disconnectWardenFmVehicle(): void {
	wardenFmVehicleSession.disconnect()
}
