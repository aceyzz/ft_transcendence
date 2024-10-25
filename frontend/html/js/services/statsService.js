import * as api from '../utils/api.js'
import { Match } from "../models/Match.js";

class StatsService {
	async listMatches(userId, perPage = 20, page = 1) {
		return await api.getPaginated(
			'/game/matches/',
			{ user_id: userId, per_page: perPage, page },
			(data) => new Match(data)
		)
	}

	async getUserStats(userId) {
		const json = await api.get(`/game/stats/${userId}/`)
		return json.data
	}
}

export const statsService = new StatsService()