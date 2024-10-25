import { eventBus } from "../modules/eventBus.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { User } from "../models/User.js";
import { FriendRequest } from '../models/FriendRequest.js'
import { tempAlert } from "../modules/tempAlert.js";

const url = 'wss://' + window.location.host + '/ws/app/'

export class AppWebSocketService {
	#websocket = null;

	constructor() {
		eventBus.subscribe('auth.login', this.open.bind(this))
		eventBus.subscribe('auth.logout', this.close.bind(this))
	}

	open() {
		if (this.#websocket)
			return

		this.#websocket = new WebSocket(url);
		this.#websocket.addEventListener('open', () => { })
		this.#websocket.addEventListener('message', this.#onMessage.bind(this))
		this.#websocket.addEventListener('error', (e) => {
			tempAlert.error('websocket error')
		})
		this.#websocket.addEventListener('close', (e) => {
			this.#websocket?.close()
			this.#websocket = null
		})
	}

	close() {
		this.#websocket?.close()
		this.#websocket = null
	}

	sendFriendRequest(username) {
		const message = {
			action: 'friend_request',
			data: { username }
		}

		this.send(message)
	}

	send(data) {
		try {
			this.#websocket?.send(JSON.stringify(data));
		} catch (error) {
			tempAlert('Error sending message:' + error);
		}
	}

	isConnected() {
		return !!this.#websocket
	}

	#onMessage(event) {
		const data = JSON.parse(event.data);
		const { type, ...restData } = data

		switch (type) {
			case 'chat.message':
				eventBus.trigger('chat.message_received', {
					type,
					message: new ChatMessage(restData)
				})
				break
			case 'game.match_request':
				eventBus.trigger('game.match_request.received', {
					type,
					user: new User(restData.user),
					gameUuid: restData.game_uuid,
					timestamp: new Date(restData.timestamp)
				})
				break
			case 'social.friend.connected':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user)
				})
				break
			case 'social.friend.disconnected':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user)
				})
				break
			case 'social.friend.removed':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user),
				})
				break
			case 'social.friend_request.received':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user),
					timestamp: new Date(restData.timestamp),
				})
				break
			case 'social.received_friend_request.canceled':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user)
				})
				break
			case 'social.sent_friend_request.accepted':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user),
					timestamp: new Date(restData.timestamp),
				})
				break
			case 'social.sent_friend_request.declined':
				eventBus.trigger(type, {
					type,
					user: new User(restData.user),
					timestamp: new Date(restData.timestamp),
				})
				break
			default:
				eventBus.trigger(type, restData)
		}
	}
}

export const appWebSocketService = new AppWebSocketService()