import { User } from '../models/User.js'
import * as api from '../utils/api.js'

class UserService {
	async search(username = '', perPage = 20, page = 1) {
		return await api.getPaginated(
			'/myauth/users/',
			{ search: username, per_page: perPage, page },
			(data) => new User(data)
		)
	}

	async getUser(userId) {
		const json = await api.get(`/myauth/users/${userId}/`)
		return new User(json.data.user)
	}
}

export const userService = new UserService()