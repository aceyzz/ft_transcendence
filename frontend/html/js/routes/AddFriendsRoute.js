import { authService } from '../services/authService.js'
import { socialService } from '../services/socialService.js';
import { authRequirements } from '../utils/authRequirements.js'
import { tempAlert } from '../modules/tempAlert.js';
import { eventBus } from '../modules/eventBus.js';

export class AddFriendsRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/add-friends.html';
	#components = {}

	async setup(container) {
		// Load data
		const user = authService.user
		const requestReceivedUsers = await socialService.listFriendRequestsReceived(1000)
		const requestSentUsers = await socialService.listFriendRequestsSent(1000)

		// Create components
		this.#components.receivedRequestList = new ReceivedRequestListComponent(container.querySelector(':scope #pending-requests-received'))
		this.#components.sentRequestList = new SentRequestListComponent(container.querySelector(':scope #pending-requests-sent'))

		// Setup components
		this.#components.receivedRequestList.setup(requestReceivedUsers.data)
		this.#components.sentRequestList.setup(requestSentUsers.data)
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}
}

class ReceivedRequestListComponent {
	element

	#components = {}

	constructor(element) {
		this.element = element
	}

	setup(users) {
		this.#renderRequests(users)

		eventBus.subscribe('social.friend_request.received', this.#handleFriendRequestReceived.bind(this), this)
		eventBus.subscribe('social.received_friend_request.canceled', this.#handleReceivedFriendRequestCanceled.bind(this), this)
		eventBus.subscribe('social.received_friend_request.accepted', this.#handleReceivedFriendRequestAccepted.bind(this), this)
		eventBus.subscribe('social.received_friend_request.declined', this.#handleReceivedFriendRequestDeclined.bind(this), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.friend_request.received', this)
		eventBus.subscribe('social.received_friend_request.canceled', this)
		eventBus.unsubscribe('social.received_friend_request.accepted', this)
		eventBus.unsubscribe('social.received_friend_request.declined', this)
	}

	#addRequest(user) {
		const requestComponent = new ReceivedRequestComponent()
		requestComponent.setup(user)
		this.element.appendChild(requestComponent.element)
		this.#components[user.id] = requestComponent
	}

	#removeRequest(user) {
		this.#components[user.id]?.remove()
		delete this.#components[user.id]
	}

	#renderRequests(users) {
		this.element.innerHTML = ''

		users.forEach(user => this.#addRequest(user))
	}

	#handleFriendRequestReceived({ user }) {
		this.#addRequest(user)
	}

	#handleReceivedFriendRequestCanceled({ user }) {
		this.#removeRequest(user)
	}

	#handleReceivedFriendRequestAccepted({ user }) {
		this.#removeRequest(user)
	}

	#handleReceivedFriendRequestDeclined({ user }) {
		this.#removeRequest(user)
	}
}

class ReceivedRequestComponent {
	element
	user

	constructor() {
		this.element = document.querySelector('#friend-request-received-template').content.firstElementChild.cloneNode(true)
	}

	setup(user) {
		this.user = user

		// Elements
		const avatarEl = this.element.querySelector('[data-avatar]')
		const usernameEl = this.element.querySelector('[data-username]')
		const acceptButtonEl = this.element.querySelector('[data-accept-btn]')
		const declineButtonEl = this.element.querySelector('[data-decline-btn]')

		// Display
		if (user.avatar)
			avatarEl.src = user.avatar
		avatarEl.alt = `Avatar ${user.username}`
		usernameEl.textContent = user.username

		// Events
		acceptButtonEl.addEventListener('click', this.#handleAccept.bind(this, user))
		declineButtonEl.addEventListener('click', this.#handleDecline.bind(this, user))
	}

	remove() {
		this.element?.remove()
	}

	async #handleAccept(user) {
		try {
			const msg = await socialService.acceptFriendRequest(user.id)
			tempAlert.success(msg)
			eventBus.trigger('social.received_friend_request.accepted', { user })
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleDecline(user) {
		try {
			const msg = await socialService.declineFriendRequest(user.id)
			tempAlert.success(msg)
			eventBus.trigger('social.received_friend_request.declined', { user })
		} catch (err) {
			tempAlert.error(err)
		}
	}
}

class SentRequestListComponent {
	element

	#components = {}

	constructor(element) {
		this.element = element
	}

	setup(users) {
		this.#renderRequests(users)

		eventBus.subscribe('social.friend_request.sent', this.#handleFriendRequestSent.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.canceled', this.#handleSentFriendRequestCanceled.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.accepted', this.#handleSentFriendRequestAccepted.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.declined', this.#handleSentFriendRequestDeclined.bind(this), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.friend_request.sent', this)
		eventBus.unsubscribe('social.sent_friend_request.canceled', this)
		eventBus.unsubscribe('social.sent_friend_request.accepted', this)
		eventBus.unsubscribe('social.sent_friend_request.declined', this)
	}

	#addRequest(user) {
		const requestComponent = new SentRequestComponent()
		requestComponent.setup(user)
		this.element.appendChild(requestComponent.element)
		this.#components[user.id] = requestComponent
	}

	#removeRequest(user) {
		this.#components[user.id]?.remove()
		delete this.#components[user.id]
	}

	#renderRequests(users) {
		this.element.innerHTML = ''

		users.forEach(user => this.#addRequest(user))
	}

	#handleFriendRequestSent({ user }) {
		this.#addRequest(user)
	}

	#handleSentFriendRequestCanceled({ user }) {
		this.#removeRequest(user)
	}

	#handleSentFriendRequestAccepted({ user }) {
		this.#removeRequest(user)
	}

	#handleSentFriendRequestDeclined({ user }) {
		this.#removeRequest(user)
	}
}

class SentRequestComponent {
	element
	user

	constructor() {
		this.element = document.querySelector('#friend-request-sent-template').content.firstElementChild.cloneNode(true)
	}

	setup(user) {
		this.user = user

		// Elements
		const avatarEl = this.element.querySelector('[data-avatar]')
		const usernameEl = this.element.querySelector('[data-username]')
		const cancelButtonEl = this.element.querySelector('[data-cancel-btn]')

		// Display
		if (user.avatar)
			avatarEl.src = user.avatar
		avatarEl.alt = `Avatar ${user.username}`
		usernameEl.textContent = user.username

		// Events
		cancelButtonEl.addEventListener('click', this.#handleCancel.bind(this, user))
	}

	remove() {
		this.element?.remove()
	}

	async #handleCancel(user) {
		try {
			const msg = await socialService.cancelFriendRequest(user.id)
			tempAlert.success(msg)
			eventBus.trigger('social.sent_friend_request.canceled', { user })
		} catch (err) {
			tempAlert.error(err)
		}
	}
}