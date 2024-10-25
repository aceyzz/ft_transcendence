import { eventBus } from '../modules/eventBus.js';
import { tempAlert } from '../modules/tempAlert.js';

export class RemoteGameWebSocketService {
	#websocket = null;
	#pendingMessages = [];
	#gameStarted = false;
	#handlers = {}

	constructor({ start, state, finished, canceled }) {
		this.#handlers.start = start
		this.#handlers.state = state
		this.#handlers.finished = finished
		this.#handlers.canceled = canceled
	}

	open() {
		if (this.#websocket) return;

		const url = 'wss://' + window.location.host + '/ws/game/remote/';
		this.#websocket = new WebSocket(url);

		this.#websocket.addEventListener('open', () => {
			this.#flushPendingMessages();
		});

		this.#websocket.addEventListener('message', this.#onMessage.bind(this));

		this.#websocket.addEventListener('close', () => {
			this.#websocket = null;
			this.#clearPendingMessages();
			this.#gameStarted = false;
		});

		this.#websocket.addEventListener('error', () => {
			tempAlert.error('Web socket error');
		});
	}

	close() {
		if (this.#websocket) this.#websocket.close();
	}

	sendPlayerAction(action) {
		if (!this.#gameStarted) return;
		const message = { type: 'game.player_action', action };
		this.#sendMessage(message);
	}

	sendJoinAsHost(gameUuid) {
		const message = { type: 'game.join_as_host', game_uuid: gameUuid };
		this.#sendMessage(message);
	}

	sendJoinAsGuest(gameUuid) {
		const message = { type: 'game.join_as_guest', game_uuid: gameUuid };
		this.#sendMessage(message);
	}

	#sendMessage(message) {
		if (this.#websocket && this.#websocket.readyState === WebSocket.OPEN)
			this.#websocket.send(JSON.stringify(message));
		else
			this.#pendingMessages.push(message);
	}

	#flushPendingMessages() {
		while (this.#pendingMessages.length > 0) {
			const message = this.#pendingMessages.shift();
			this.#sendMessage(message);
		}
	}

	#clearPendingMessages() {
		this.#pendingMessages = [];
	}

	#onMessage(event) {
		const data = JSON.parse(event.data);
		switch (data.type) {
			case 'game.start':
				this.#gameStarted = true;
				this.#flushPendingMessages()
				this.#handlers.start(data)
				break;
			case 'game.state':
				this.#handlers.state(data.game_state)
				break;
			case 'game.finished':
				this.#gameStarted = false;
				this.#handlers.finished(data)
				break;
			case 'game.canceled':
				this.#gameStarted = false;
				this.#handlers.canceled(data)
				break;
			case 'error':
				tempAlert.error(data.message);
				break;
			default:
				tempAlert.warning('Unknown message type: ' + data.type);
				break;
		}
	}
}