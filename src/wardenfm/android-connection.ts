export const ANDROID_CAR_CONNECTION_NOT_CONNECTED = 0
export const ANDROID_CAR_CONNECTION_NATIVE = 1
export const ANDROID_CAR_CONNECTION_PROJECTION = 2

export interface AndroidCarConnectionPort {
	getConnectionType(): Promise<number>
	subscribe(listener: (connectionType: number) => void): () => void
}

export function registerAndroidAutoProjection(
	port: AndroidCarConnectionPort,
	onConnect: () => void,
	onDisconnect: () => void,
): () => void {
	let active = true
	let projecting = false

	const handle = (connectionType: number) => {
		if (!active) return
		const nextProjecting = connectionType === ANDROID_CAR_CONNECTION_PROJECTION
		if (nextProjecting === projecting) return
		projecting = nextProjecting
		if (projecting) onConnect()
		else onDisconnect()
	}

	const unsubscribe = port.subscribe(handle)
	void port.getConnectionType().then(handle)

	return () => {
		active = false
		unsubscribe()
	}
}

export async function initializeAndroidAutoProjection(
	port: AndroidCarConnectionPort,
	onConnect: () => void,
	onDisconnect: () => void,
): Promise<() => void> {
	let active = true
	let projecting = false
	let receivedLiveUpdate = false

	const handle = (connectionType: number) => {
		if (!active) return
		const nextProjecting = connectionType === ANDROID_CAR_CONNECTION_PROJECTION
		if (nextProjecting === projecting) return
		projecting = nextProjecting
		if (projecting) onConnect()
		else onDisconnect()
	}

	const unsubscribe = port.subscribe((connectionType) => {
		receivedLiveUpdate = true
		handle(connectionType)
	})

	const initialConnectionType = await port.getConnectionType()
	if (!receivedLiveUpdate) handle(initialConnectionType)

	return () => {
		active = false
		unsubscribe()
	}
}
