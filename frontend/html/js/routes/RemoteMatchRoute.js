import { tempAlert } from '../modules/tempAlert.js';
import { authRequirements } from '../utils/authRequirements.js';
import { authService } from '../services/authService.js';
import { RemoteGameComponent } from '../components/RemoteGameComponent.js';
import { routerService } from '../services/routerService.js';
import { userService } from '../services/userService.js'
import { gameService } from '../services/gameService.js';
import { debounce } from '../utils/utils.js'
import { loadingComponent, errorComponent, emptyComponent } from '../modules/components.js';

export class RemoteMatchRoute {
	authentication = authRequirements.loginRequired;
	partial = 'partials/remote-match.html';

	#components = {}
	#player1;
	#player2;

	setup(container) {
		const gameId = localStorage.getItem('gameId');
		localStorage.removeItem('gameId')
		const opponent = JSON.parse(localStorage.getItem('opponent'));
		localStorage.removeItem('opponent')

		if (gameId && opponent) {
			this.#setupAsGuest(container, gameId, opponent);
		} else {
			this.#setupAsHost(container, opponent);
		}
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}

	#setupAsHost(container, opponent = null) {
		this.#player1 = authService.user

		this.#components.invitePlayer = new InvitePlayerComponent(container.querySelector('#invite-player-popup'))
		this.#components.game = new RemoteGameComponent(container.querySelector('#game-container'))

		this.#components.game.setup(() => routerService.navigate('/game'))

		if (opponent)
			this.#stateCreateGame(opponent)
		else
			this.#stateInvitePlayer()
	}

	#setupAsGuest(container, gameId, opponent) {
		this.#player1 = opponent
		this.#player2 = authService.user

		this.#components.game = new RemoteGameComponent(container.querySelector('#game-container'))

		this.#components.game.setup(() => routerService.navigate('/game'))

		this.#stateJoinAsGuest(gameId)
	}

	#stateInvitePlayer() {
		this.#components.invitePlayer.show((opponent) => this.#stateCreateGame(opponent))
	}

	async #stateCreateGame(opponent) {
		let gameUuid;
		try {
			gameUuid = await gameService.sendMatchRequest(opponent.id)
			this.#player2 = opponent
			this.#stateJoinAsHost(gameUuid)
		} catch (err) {
			this.#stateInvitePlayer()
			tempAlert.error(err)
		}
	}

	#stateJoinAsHost(gameUuid) {
		this.#components.invitePlayer.hide()

		this.#components.game.show()
		this.#components.game.joinAsHost(gameUuid, this.#player1, this.#player2)
	}

	#stateJoinAsGuest(gameId) {
		this.#components.game.show()
		this.#components.game.joinAsGuest(gameId, this.#player1, this.#player2)
	}
}

class InvitePlayerComponent {
	element

	#isOpen = false
	#components = {}

	constructor(element) {
		this.element = element

		this.#components.input = new InvitePlayerInputComponent(this.element.querySelector('#invite-player-input'));
		this.#components.playerList = new InvitePlayerListComponent(this.element.querySelector('#invite-player-list'));
	}

	show(onSelectUser) {
		if (this.#isOpen)
			return

		this.#isOpen = true
		this.element.classList.remove('hidden');
		this.#components.input.setup((query) => this.#components.playerList.update(query));
		this.#components.playerList.setup(onSelectUser);
	}

	hide() {
		if (!this.#isOpen)
			return

		this.#isOpen = false
		this.element.classList.add('hidden');
		this.#components.playerList.cleanup();
	}
}

class InvitePlayerInputComponent {
	element;

	constructor(element) {
		this.element = element;
	}

	setup(onSearch) {
		this.element.addEventListener('input', debounce((e) => onSearch(e.target.value.trim()), 300));
	}
}

class InvitePlayerListComponent {
	element;
	#components = {};
	#onSelectUser
	#loadingMessage;
	#errorMessage;
	#emptyMessage;

	constructor(element) {
		this.element = element;
	}

	setup(onSelectUser) {
		this.#onSelectUser = onSelectUser
		this.#clearMessages();
	}

	cleanup() {
		this.#resetItems();
	}

	async update(searchTerm) {
		this.#clearMessages();

		if (!searchTerm) {
			this.#resetItems();
			return;
		}

		this.#showLoadingMessage();

		try {
			const users = await userService.search(searchTerm, 10, 1);
			this.#resetItems();

			if (users.data.length === 0) {
				this.#showEmptyMessage();
			} else {
				this.#renderItems(users.data);
			}
		} catch (err) {
			tempAlert.error(err);
		}
	}

	#addItem(user) {
		const itemComponent = new InvitePlayerItemComponent(user);
		itemComponent.setup(this.#onSelectUser);
		this.element.appendChild(itemComponent.element);
		this.#components[user.id] = itemComponent;
	}

	#resetItems() {
		Object.values(this.#components).forEach(component => component.remove());
		this.#components = {};
		this.#clearMessages();
	}

	#renderItems(users) {
		this.#resetItems();
		users.forEach(user => this.#addItem(user));
	}

	// creer div emessage d'erreur par defaut, active/desactive selon affichage
	#showLoadingMessage() {
		this.#loadingMessage = document.createElement('div');
		this.#loadingMessage.innerHTML = loadingComponent("Loading users...");
		this.element.appendChild(this.#loadingMessage);
	}

	#showErrorMessage() {
		this.#errorMessage = document.createElement('div');
		this.#errorMessage.innerHTML = errorComponent("An error occurred while fetching users");
		this.element.appendChild(this.#errorMessage);
	}

	#showEmptyMessage() {
		this.#emptyMessage = document.createElement('div');
		this.#emptyMessage.innerHTML = emptyComponent("No users found");
		this.element.appendChild(this.#emptyMessage);
	}

	#clearMessages() {
		this.#loadingMessage?.remove();
		this.#errorMessage?.remove();
		this.#emptyMessage?.remove();
	}
}

class InvitePlayerItemComponent {
	element;
	user;

	constructor(user) {
		this.element = document.getElementById('invite-player-item-template').content.firstElementChild.cloneNode(true);
		this.user = user;
	}

	setup(onSelectUser) {
		const avatarEl = this.element.querySelector('[data-avatar]');
		const usernameEl = this.element.querySelector('[data-username]');
		const invitePlayButtonEl = this.element.querySelector('[data-invite-play-btn]');

		avatarEl.src = this.user.avatar || '/static/assets/user_default.png';
		usernameEl.textContent = this.user.username;

		if (this.user.isConnected)
			this.#enableInviteButton(invitePlayButtonEl, onSelectUser)
		else
			this.#disableInviteButton(invitePlayButtonEl)
	}

	remove() {
		this.element.remove()
	}

	#enableInviteButton(buttonEl, onSelectUser) {
		buttonEl.classList.remove('disabled');
		buttonEl.addEventListener('click', () => {
			onSelectUser(this.user)
		});
	}

	#disableInviteButton(buttonEl) {
		buttonEl.classList.add('disabled');
		buttonEl.title = "User not connected";
		buttonEl.addEventListener('click', () => {
			tempAlert.warning('User not connected');
		});
	}
}
