import * as api from '../utils/api.js'
import { User } from '../models/User.js'

class SocialService {
	async listFriends(userId, perPage = 20, page = 1) {
		return await api.getPaginated(
			'/social/friends/',
			{ user_id: userId, per_page: perPage, page },
			(data) => new User(data)
		)
	}

	async removeFriend(userId) {
		const json = await api.destroy(`/social/friends/${userId}/`)
		return json.message
	}

	async listFriendRequestsReceived(perPage = 20, page = 1) {
		return await api.getPaginated(
			'/social/friend-requests/received/',
			{ per_page: perPage, page },
			(data) => new User(data)
		)
	}

	async listFriendRequestsSent(perPage = 20, page = 1) {
		return await api.getPaginated(
			'/social/friend-requests/sent/',
			{ per_page: perPage, page },
			(data) => new User(data)
		)
	}

	async sendFriendRequest(userId) {
		const formData = new FormData()
		formData.append('friend_id', userId)

		const json = await api.post('/social/friend-requests/sent/', formData)
		return json.message
	}

	async acceptFriendRequest(userId) {
		const json = await api.put(`/social/friend-requests/received/${userId}/`)
		return json.message
	}

	async declineFriendRequest(userId) {
		const json = await api.destroy(`/social/friend-requests/received/${userId}/`)
		return json.message
	}

	async cancelFriendRequest(userId) {
		const json = await api.destroy(`/social/friend-requests/sent/${userId}/`)
		return json.message
	}

	async listBlockedUsers(perPage = 20, page = 1) {
		return await api.getPaginated(
			'/social/blocked-users/',
			{ per_page: perPage, page },
			(data) => new User(data)
		)
	}

	async blockUser(userId) {
		const formData = new FormData()
		formData.append('block_user_id', userId)

		const json = await api.post('/social/blocked-users/', formData)
		return json.message
	}

	async unblockUser(userId) {
		const json = await api.destroy(`/social/blocked-users/${userId}/`)
		return json.message
	}
}

export const socialService = new SocialService()