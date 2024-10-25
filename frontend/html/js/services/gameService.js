import * as api from '../utils/api.js'

class GameService {
	async sendMatchRequest(opponentId) {
		const data = new FormData()
		data.append('opponent_id', opponentId)
		const json = await api.post('/game/matches/', data)
		return json.data.game_uuid
	}

	async declineMatchRequest(gameUuid) {
		const json = await api.destroy(`/game/matches/${gameUuid}/`)
		return json.message
	}
}

export const gameService = new GameService()