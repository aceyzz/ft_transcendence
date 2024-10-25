import { authService } from '../services/authService.js'
import { socialService } from '../services/socialService.js'
import { emptyComponent } from '../modules/components.js'
import { authRequirements } from '../utils/authRequirements.js';
import { tempAlert } from '../modules/tempAlert.js';
import { eventBus } from '../modules/eventBus.js';

export class BlockedRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/blocked-users.html';
	#components = {}

	async setup(container) {
		// Load data
		const user = authService.user
		const blockedUsers = await socialService.listBlockedUsers(1000);

		// Create components
		this.#components.blockedUsers = new BlockedUsersComponent(container.querySelector(':scope #blocked-users-list'))

		// Setup components
		this.#components.blockedUsers.setup(blockedUsers.data)
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}
}

class BlockedUsersComponent {
	element

	#components = {}

	constructor(element = null) {
		this.element = element
	}

	setup(users) {
		this.#renderBlockedUsers(users)

		eventBus.subscribe('social.block_user', this.#handleBlockUser.bind(this), this)
		eventBus.subscribe('social.unblock_user', this.#handleUnblockUser.bind(this), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.block_user', this)
		eventBus.unsubscribe('social.unblock_user', this)
	}

	#addBlockedUser(user) {
		const blockedUserComponent = new BlockedUserComponent()
		blockedUserComponent.setup(user)
		this.element.appendChild(blockedUserComponent.element)
		this.#components[user.id] = blockedUserComponent
	}

	#removeBlockedUser(user) {
		this.#components[user.id]?.remove()
		delete this.#components[user.id]
	}

	#renderBlockedUsers(users) {
		this.element.innerHTML = ''

		users.forEach(user => this.#addBlockedUser(user))
	}

	#handleBlockUser({ user }) {
		this.#addBlockedUser(user)
	}

	#handleUnblockUser({ user }) {
		this.#removeBlockedUser(user)
	}
}

class BlockedUserComponent {
	element

	constructor() {
		this.element = document.getElementById('blocked-user').content.firstElementChild.cloneNode(true)
	}

	setup(user) {
		// Elements
		const imgEl = this.element.querySelector('[data-avatar]')
		const usernameEl = this.element.querySelector('[data-username]')
		const unblockButtonEl = this.element.querySelector('[data-unblock-btn]')

		// Display
		if (user.avatar)
			imgEl.src = user.avatar
		imgEl.alt = user.username
		usernameEl.textContent = user.username

		// Event handlers
		unblockButtonEl.addEventListener('click', this.#handleUnblock.bind(this, user))
	}

	remove() {
		this.element?.remove()
	}

	async #handleUnblock(user) {
		try {
			const message = await socialService.unblockUser(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.unblock_user', { user })
		} catch (err) {
			tempAlert.error(err)
		}
	}
}