import { Platform } from 'react-native'
import TrackPlayer, { Event } from 'react-native-track-player'
import { SKIP_TO_PREVIOUS_THRESHOLD } from '../configs/player.config'
import { CarPlay } from 'react-native-carplay'
import { initializeAndroidAutoProjection } from '../wardenfm/android-connection'
import { createNativeAndroidCarConnectionPort } from '../wardenfm/native-android-car-connection'
import { createGovernedPlaybackHandlers } from '../wardenfm/playback-gate'
import {
	connectWardenFmVehicle,
	disconnectWardenFmVehicle,
	failClosedWardenFmVehicle,
	wardenFmVehicleSession,
} from '../wardenfm/runtime'

/**
 * Jellify Playback Service.
 *
 * Sets up event listeners for remote control events and
 * runs for the duration of the app lifecycle.
 *
 * Vehicle-originated effects are fail-closed through WardenFM. TrackPlayer
 * remains the media engine and does not grant itself vehicle authority.
 */
export async function PlaybackService() {
	if (Platform.OS === 'android') {
		const androidConnectionPort = createNativeAndroidCarConnectionPort()
		if (!androidConnectionPort) {
			failClosedWardenFmVehicle('android-auto')
		} else {
			try {
				await initializeAndroidAutoProjection(
					androidConnectionPort,
					() => connectWardenFmVehicle('android-auto'),
					() => disconnectWardenFmVehicle(),
				)
			} catch {
				failClosedWardenFmVehicle('android-auto')
			}
		}
	}

	const governed = createGovernedPlaybackHandlers(
		wardenFmVehicleSession,
		TrackPlayer,
		SKIP_TO_PREVIOUS_THRESHOLD,
	)

	TrackPlayer.addEventListener(Event.RemotePlay, governed.play)
	TrackPlayer.addEventListener(Event.RemotePause, governed.pause)
	TrackPlayer.addEventListener(Event.RemoteNext, governed.next)
	TrackPlayer.addEventListener(Event.RemotePrevious, governed.previous)
	TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
		await governed.seek(event.position)
	})
}

export function registerAutoService(onConnect: () => void, onDisconnect: () => void) {
	CarPlay.registerOnConnect(onConnect)
	CarPlay.registerOnDisconnect(onDisconnect)

	return () => {
		CarPlay.unregisterOnConnect(onConnect)
		CarPlay.unregisterOnDisconnect(onDisconnect)
	}
}
