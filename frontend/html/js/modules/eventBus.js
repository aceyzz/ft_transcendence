class EventBus {
	#subscribers = {
		'auth.login': [], // Data: { user }
		'auth.logout': [],
		'auth.profile_updated': [], // Data: { user }

		'social.friend.connected': [], // Data: { user }
		'social.friend.disconnected': [], // Data: { user }
		'social.friend.removed': [], // Data: { user }

		'social.friend_request.sent': [], // Data: { user }
		'social.friend_request.received': [], // Data: { user, timestamp }

		'social.sent_friend_request.canceled': [], // Data: { user }
		'social.sent_friend_request.accepted': [], // Data: { user, timestamp }
		'social.sent_friend_request.declined': [], // Data: { user, timestamp }

		'social.received_friend_request.canceled': [], // Data { user }
		'social.received_friend_request.accepted': [], // Data: { user }
		'social.received_friend_request.declined': [], // Data: { user }

		'social.block_user': [], // Data: { user }
		'social.unblock_user': [], // Data: { user }

		'game.match_request.received': [], // Data: { user, game_uuid }
		'game.tournament_request.received': [], // Data: { user }
		'game.state': [], // Data: { game_state }
		'game.start': [], // Data: {}
		'game.finished': [], // Data: { type: 'game.finished', winner: 'draw', player1_score: 0, player2_score: 0 }
		'game.match_request': [], // Data: { game_uuid }
		'player.invited': [], // Data: { player }

		'chat.message_received': [], // Data: { message }

		'notification.removed': [], // Data: { notification }
	}

	subscribe(event, callback, label) {
		this.#getSubscribers(event).push([callback, label])
	}

	unsubscribe(event, label) {
		const subscribers = this.#getSubscribers(event)
		const index = subscribers.findIndex(([callback, lbl]) => lbl === label)
		if (index > -1)
			subscribers.splice(index, 1)
	}

	trigger(event, data) {
		this.#getSubscribers(event).forEach(([cb, label]) => cb(data))
	}

	#getSubscribers(event) {
		const subscribers = this.#subscribers[event]

		if (!subscribers)
			throw new Error(`The following event is invalid: ${event}`)

		return subscribers
	}
}

export const eventBus = new EventBus()