import * as api from '../utils/api.js'
import { UnauthenticatedError, ServerError, ValidationListError, ValidationMessageError } from '../utils/errors.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { Pagination } from '../models/Pagination.js'

/*

"id": 1,
"from_user": 1,
"to_user": 2,
"text": "On se voit à la réunion de demain.",
"timestamp": "2024-08-27T00:00:00"

*/
export class ChatService {
	async listMessages(withUserId, perPage = 20, page = 1) {
		return await api.getPaginated(
			'/chat/messages/',
			{ with_user_id: withUserId, per_page: perPage, page },
			(data) => new ChatMessage(data)
		)
	}

	async sendMessage(formData) {
		const json = await api.post('/chat/messages/', formData)
		return new ChatMessage(json.data.message)
	}
}

export const chatService = new ChatService()