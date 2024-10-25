import { emptyComponent } from '../modules/components.js'
import { authService } from '../services/authService.js'
import { socialService } from '../services/socialService.js'
import { authRequirements } from '../utils/authRequirements.js';
import { routerService } from '../services/routerService.js';
import { tempAlert } from '../modules/tempAlert.js';
import { eventBus } from '../modules/eventBus.js';

export class FriendListRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/friend-list.html';
	#components = {}

	async setup(container) {
		// Load data
		const user = authService.user
		const friends = await socialService.listFriends(user.id, 10000);

		// Create components
		this.#components.friendList = new FriendListComponent(container.querySelector('#friends-container'))

		// Component setup
		this.#components.friendList.setup(friends.data)
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}
}

class FriendListComponent {
	element

	#components = {}

	constructor(element = null) {
		this.element = element
	}

	setup(friends) {
		this.#renderFriendList(friends)

		eventBus.subscribe('social.friend.removed', this.#handleFriendRemoved.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.accepted', this.#handleSentFriendRequestAccepted.bind(this), this)
		eventBus.subscribe('social.received_friend_request.accepted', this.#handleReceivedFriendRequestAccepted.bind(this), this)
		eventBus.subscribe('social.friend.connected', this.#handleFriendConnected.bind(this), this)
		eventBus.subscribe('social.friend.disconnected', this.#handleFriendDisconnected.bind(this), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.friend.removed', this)
		eventBus.unsubscribe('social.sent_friend_request.accepted', this)
		eventBus.unsubscribe('social.received_friend_request.accepted', this)
	}

	#addFriend(user) {
		const friendComponent = new FriendComponent(user)
		friendComponent.setup(user)
		this.element.appendChild(friendComponent.element)
		this.#components[user.id] = friendComponent
	}

	#removeFriend(user) {
		this.#components[user.id]?.remove()
		delete this.#components[user.id]
	}

	#renderFriendList(friends) {
		this.element.innerHTML = ''

		friends.forEach(friend => this.#addFriend(friend))
	}

	#handleFriendRemoved({ user }) {
		this.#removeFriend(user)
	}

	#handleSentFriendRequestAccepted({ user }) {
		this.#addFriend(user)
	}

	#handleReceivedFriendRequestAccepted({ user }) {
		this.#addFriend(user)
	}

	#handleFriendConnected({ user }) {
		this.#components[user.id]?.setConnected()
	}

	#handleFriendDisconnected({ user }) {
		this.#components[user.id]?.setDisconnected()
	}
}

class FriendComponent {
	element
	friend

	constructor(friend) {
		this.element = document.getElementById('friend-template').content.firstElementChild.cloneNode(true)

		this.friend = friend
	}

	setup() {
		// Template
		const imgEl = this.element.querySelector('img[data-friend-avatar]')
		const usernameEl = this.element.querySelector('[data-friend-username]')
		const profileButtonEl = this.element.querySelector('[data-profile-btn]')
		const blockButtonEl = this.element.querySelector('button[data-block-btn]')
		const removeButtonEl = this.element.querySelector('button[data-remove-btn]')

		// Display
		if (this.friend.isConnected)
			this.setConnected()
		if (this.friend.avatar) {
			imgEl.src = this.friend.avatar
			imgEl.alt = `Avatar ${this.friend.username}`
		}
		usernameEl.textContent = this.friend.username

		// Events
		profileButtonEl.addEventListener('click', () => routerService.navigate(`/user-profile?user_id=${this.friend.id}`))
		blockButtonEl.addEventListener('click', this.#handleBlock.bind(this, this.friend))
		removeButtonEl.addEventListener('click', this.#handleRemove.bind(this, this.friend))
	}

	remove() {
		this.element?.remove()
	}

	setConnected() {
		this.element.classList.add('connected')
	}

	setDisconnected() {
		this.element.classList.remove('connected')
	}

	async #handleBlock(friend) {
		try {
			const message = await socialService.blockUser(friend.id)
			tempAlert.success(message)
			eventBus.trigger('social.friend.removed', { user: friend })
			eventBus.trigger('social.block_user', { user: friend })
		} catch (err) {
			tempAlert(err)
		}
	}

	async #handleRemove(friend) {
		try {
			const msg = await socialService.removeFriend(friend.id)
			tempAlert.success(msg)
			eventBus.trigger('social.friend.removed', { user: friend })
		} catch (err) {
			tempAlert.error(err)
		}
	}
}