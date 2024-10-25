import { notificationsComponent } from './notificationsComponent.js'
import { chatComponent } from './chatComponent.js'
import { overlayManager } from '../modules/overlayManager.js'
import { routerService } from '../services/routerService.js'
import { tempAlert } from '../modules/tempAlert.js'
import { socialService } from '../services/socialService.js'
import { userService } from '../services/userService.js'
import { debounce } from '../utils/utils.js'
import { eventBus } from '../modules/eventBus.js'

class SearchComponent {
	#isOpen = false

	#components = {}

	setup(buttonEl, containerEl) {
		// Create components
		this.#components.container = new SearchPopupContainerComponent(containerEl)
		this.#components.input = new SearchInputComponent(containerEl.querySelector('#search-input'))
		this.#components.list = new SearchListComponent(containerEl.querySelector('#search-list'))

		// Setup components
		this.#components.input.setup((query) => this.#components.list.update(query))
		this.#components.list.setup()

		// Events
		buttonEl.addEventListener('click', () => this.toggle())
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}

	toggle() {
		this.#isOpen ? this.close() : this.open()
	}

	open() {
		if (this.#isOpen)
			return

		this.#isOpen = true
		notificationsComponent.close()
		chatComponent.close()
		this.#components.container.open()
		this.#components.input.select()
		this.#components.list.update(this.#components.input.value)
		overlayManager.show(this)
	}

	close() {
		if (!this.#isOpen)
			return

		this.#isOpen = false
		this.#components.container.close()
		overlayManager.hide()
	}
}

class SearchPopupContainerComponent {
	element

	constructor(element) {
		this.element = element
	}

	open() {
		this.element.classList.remove('hidden')
	}

	close() {
		this.element.classList.add('hidden')
	}
}

class SearchInputComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(onSearch) {
		this.element.addEventListener('input', debounce((e) => onSearch(e.target.value), 300))
	}

	get value() {
		return this.element.value
	}

	select() {
		this.element.select()
	}
}

class SearchListComponent {
	element

	#components = {}

	constructor(element) {
		this.element = element
	}

	setup() {
		eventBus.subscribe('social.friend.removed', this.#handleEvent.bind(this, null), this)
		eventBus.subscribe('social.friend_request.sent', this.#handleEvent.bind(this, 'friend_request_sent'), this)
		eventBus.subscribe('social.friend_request.received', this.#handleEvent.bind(this, 'friend_request_received'), this)
		eventBus.subscribe('social.sent_friend_request.canceled', this.#handleEvent.bind(this, null), this)
		eventBus.subscribe('social.sent_friend_request.accepted', this.#handleEvent.bind(this, 'friend'), this)
		eventBus.subscribe('social.sent_friend_request.declined', this.#handleEvent.bind(this, null), this)
		eventBus.subscribe('social.received_friend_request.canceled', this.#handleEvent.bind(this, null), this)
		eventBus.subscribe('social.received_friend_request.accepted', this.#handleEvent.bind(this, 'friend'), this)
		eventBus.subscribe('social.received_friend_request.declined', this.#handleEvent.bind(this, null), this)
		eventBus.subscribe('social.block_user', this.#handleEvent.bind(this, 'blocked'), this)
		eventBus.subscribe('social.unblock_user', this.#handleEvent.bind(this, null), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.friend.removed', this)
		eventBus.unsubscribe('social.friend_request.sent', this)
		eventBus.unsubscribe('social.friend_request.received', this)
		eventBus.unsubscribe('social.sent_friend_request.canceled', this)
		eventBus.unsubscribe('social.sent_friend_request.accepted', this)
		eventBus.unsubscribe('social.sent_friend_request.declined', this)
		eventBus.unsubscribe('social.received_friend_request.canceled', this)
		eventBus.unsubscribe('social.received_friend_request.accepted', this)
		eventBus.unsubscribe('social.received_friend_request.declined', this)
		eventBus.unsubscribe('social.block_user', this)
		eventBus.unsubscribe('social.unblock_user', this)
	}

	async update(searchTerm) {
		try {
			const users = await userService.search(searchTerm, 10, 1)
			this.#renderItems(users.data)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	#addItem(user) {
		const itemComponent = new SearchItemComponent(user)
		itemComponent.setup()
		this.element.appendChild(itemComponent.element)
		this.#components[user.id] = itemComponent
	}

	#resetItems() {
		Object.values(this.#components).forEach(component => component.remove())
		this.#components = {}
	}

	#renderItems(users) {
		this.#resetItems()

		users.forEach(user => this.#addItem(user))
	}

	#handleEvent(relationship, { user }) {
		this.#components[user.id]?.displayButtonsForRelationship(relationship)
	}
}

class SearchItemComponent {
	element
	user

	constructor(user) {
		this.element = document.getElementById('search-item-template').content.firstElementChild.cloneNode(true)

		this.user = user
	}

	setup() {
		// Elements
		const avatarEl = this.element.querySelector('[data-avatar]')
		const usernameEl = this.element.querySelector('[data-username]')
		const addFriendButtonEl = this.element.querySelector('[data-add-friend-btn]')
		const removeFriendButtonEl = this.element.querySelector('[data-remove-friend-btn]')
		const blockUserButtonEl = this.element.querySelector('[data-block-user-btn]')
		const invitePlayButtonEl = this.element.querySelector('[data-invite-play-btn]')
		const chatButtonEl = this.element.querySelector('[data-chat-btn]')
		const acceptFriendButtonEl = this.element.querySelector('[data-accept-friend-btn]')
		const declineFriendButtonEl = this.element.querySelector('[data-decline-friend-btn]')
		const cancelFriendRequestButtonEl = this.element.querySelector('[data-cancel-friend-request-btn]')
		const unblockUserButtonEl = this.element.querySelector('[data-unblock-user-btn]')

		// Display
		if (this.user.avatar)
			avatarEl.src = this.user.avatar
		avatarEl.alt = `Avatar ${this.user.username}`
		usernameEl.textContent = this.user.username
		this.displayButtonsForRelationship(this.user.relationship)

		// Events
		avatarEl.addEventListener('click', this.#handleProfileButton.bind(this, this.user))
		addFriendButtonEl.addEventListener('click', this.#handleAddFriend.bind(this, this.user))
		removeFriendButtonEl.addEventListener('click', this.#handleRemoveFriend.bind(this, this.user))
		blockUserButtonEl.addEventListener('click', this.#handleBlockUser.bind(this, this.user))
		invitePlayButtonEl.addEventListener('click', this.#handleInvitePlay.bind(this, this.user))
		chatButtonEl.addEventListener('click', this.#handleChat.bind(this, this.user))
		acceptFriendButtonEl.addEventListener('click', this.#handleAcceptFriend.bind(this, this.user))
		declineFriendButtonEl.addEventListener('click', this.#handleDeclineFriend.bind(this, this.user))
		cancelFriendRequestButtonEl.addEventListener('click', this.#handleCancelFriendRequest.bind(this, this.user))
		unblockUserButtonEl.addEventListener('click', this.#handleUnblockUser.bind(this, this.user))
	}

	remove() {
		this.element?.remove()
	}

	displayButtonsForRelationship(relationship) {
		const buttonGroups = {
			'none': ['add-friend', 'block-user'],
			'friend': ['chat', 'invite-play', 'block-user', 'remove-friend'],
			'friend_request_sent': ['cancel-friend-request'],
			'friend_request_received': ['accept-friend', 'decline-friend'],
			'blocked': ['unblock-user'],
		}

		this.element.querySelectorAll('button').forEach(button => button.classList.add('hidden'))

		const visibleButtonTags = buttonGroups[relationship || 'none']
		visibleButtonTags
			.forEach(tag =>
				this.element.querySelector(`button[data-${tag}-btn]`)?.classList.remove('hidden')
			)
	}

	#handleProfileButton(user) {
		routerService.navigate(`/user-profile?user_id=${user.id}`)
	}

	async #handleAddFriend(user) {
		try {
			const message = await socialService.sendFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.friend_request.sent', { user })
			this.displayButtonsForRelationship('friend_request_sent')
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleRemoveFriend(user) {
		try {
			const message = await socialService.removeFriend(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.friend.removed', { user })
			this.displayButtonsForRelationship(null)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	#handleInvitePlay(user) {
		if (!user.isConnected) {
			tempAlert.error('User is not connected')
			return
		}
		localStorage.setItem('opponent', JSON.stringify(user))
		routerService.navigate(`/remote-match`)
	}

	#handleChat(user) {
		searchComponent.close()
		chatComponent.open(user)
	}

	async #handleAcceptFriend(user) {
		try {
			const message = await socialService.acceptFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.received_friend_request.accepted', { user })
			this.displayButtonsForRelationship('friend')
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleDeclineFriend(user) {
		try {
			const message = await socialService.declineFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.received_friend_request.declined', { user })
			this.displayButtonsForRelationship(null)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleCancelFriendRequest(user) {
		try {
			const message = await socialService.cancelFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.sent_friend_request.canceled', { user })
			this.displayButtonsForRelationship(null)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleBlockUser(user) {
		try {
			const message = await socialService.blockUser(user.id)
			tempAlert.success(message)
			if (user.relationship === 'friend')
				eventBus.trigger('social.friend.removed', { user })
			eventBus.trigger('social.block_user', { user })
			this.displayButtonsForRelationship('blocked')
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleUnblockUser(user) {
		try {
			const message = await socialService.unblockUser(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.unblock_user', { user })
			this.displayButtonsForRelationship(null)
		} catch (err) {
			tempAlert.error(err)
		}
	}
}

export const searchComponent = new SearchComponent()

/*

buttons :
	<button id="add-friend" class="btn action-button add-friend-btn hidden" title="Add friend">
	<button id="remove-friend" class="btn action-button remove-friend-btn hidden" title="Remove friend">
	<button id="block-user" class="btn action-button block-user-btn hidden" title="Block user">
	<button id="invite-play" class="btn action-button invite-play-btn hidden" title="Invite to play">
	<button id="chat-friend" class="btn action-button chat-w-friend-btn hidden" title="Chat with friend">
	<button id="accept-friend" class="btn action-button accept-friend-btn hidden" title="Accept friend request">
	<button id="decline-friend" class="btn action-button decline-friend-btn hidden" title="Decline friend request">
	<button id="cancel-friend" class="btn action-button cancel-friend-btn hidden" title="Cancel friend request">
	<button id="unblock-user" class="btn action button unblock-btn hidden" title="Unblock">

*/