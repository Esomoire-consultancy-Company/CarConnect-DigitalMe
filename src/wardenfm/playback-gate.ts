import type { WardenFmVehicleSession } from './session'

export interface WardenFmPlayerPort {
	play(): Promise<void>
	pause(): Promise<void>
	skipToNext(): Promise<void>
	skipToPrevious(): Promise<void>
	seekTo(position: number): Promise<void>
	getProgress(): Promise<{ position: number }>
}

export interface GovernedPlaybackHandlers {
	play(): Promise<void>
	pause(): Promise<void>
	next(): Promise<void>
	previous(): Promise<void>
	seek(position: number): Promise<void>
}

export function createGovernedPlaybackHandlers(
	session: WardenFmVehicleSession,
	player: WardenFmPlayerPort,
	previousThreshold: number,
): GovernedPlaybackHandlers {
	return {
		async play() {
			if (!session.authorizeMediaCommand('play')) return
			await player.play()
		},
		async pause() {
			if (!session.authorizeMediaCommand('pause')) return
			await player.pause()
		},
		async next() {
			if (!session.authorizeMediaCommand('next')) return
			await player.skipToNext()
		},
		async previous() {
			if (!session.authorizeMediaCommand('previous')) return
			const progress = await player.getProgress()
			if (progress.position < previousThreshold) await player.skipToPrevious()
			else await player.seekTo(0)
		},
		async seek(position: number) {
			if (!session.authorizeMediaCommand('seek')) return
			await player.seekTo(position)
		},
	}
}
