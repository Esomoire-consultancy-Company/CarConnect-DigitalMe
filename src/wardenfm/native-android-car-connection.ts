import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type { AndroidCarConnectionPort } from './android-connection'

type WardenFmCarConnectionNativeModule = {
	getConnectionType(): Promise<number>
	addListener(eventName: string): void
	removeListeners(count: number): void
}

const EVENT_CONNECTION_CHANGED = 'WardenFmCarConnectionChanged'

export function createNativeAndroidCarConnectionPort(): AndroidCarConnectionPort | undefined {
	if (Platform.OS !== 'android') return undefined

	const nativeModule = NativeModules.WardenFmCarConnection as
		| WardenFmCarConnectionNativeModule
		| undefined
	if (!nativeModule) return undefined

	const emitter = new NativeEventEmitter(nativeModule)

	return {
		getConnectionType: () => nativeModule.getConnectionType(),
		subscribe: (listener) => {
			const subscription = emitter.addListener(EVENT_CONNECTION_CHANGED, listener)
			return () => subscription.remove()
		},
	}
}
