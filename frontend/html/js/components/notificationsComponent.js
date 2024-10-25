import { socialService } from '../services/socialService.js'
import { routerService } from '../services/routerService.js'
import { tempAlert } from '../modules/tempAlert.js'
import { eventBus } from '../modules/eventBus.js'
import { overlayManager } from '../modules/overlayManager.js'
import { Notification } from '../models/Notification.js'
import { chatComponent } from './chatComponent.js'
import { gameService } from '../services/gameService.js'

class NotificationsComponent {
	#notificationStore
	#isOpen = false

	#components = {}

	constructor() {
		this.#notificationStore = new NotificationStore()
	}

	setup({ buttonEl, containerEl, displayEl }) {
		// Create components
		this.#components.button = new ButtonComponent(buttonEl)
		this.#components.list = new ListComponent(containerEl)
		this.#components.display = new DisplayComponent(displayEl)

		// Setup components
		this.#components.button.setup({
			onToggle: this.toggle.bind(this)
		})
		this.#components.list.setup({
			initialNotifications: this.#notificationStore.allNotifications,
			onDisplay: (notification) => { this.#components.display.open(notification) },
		})

		// Events
		eventBus.subscribe('social.friend_request.received', this.#handleFriendRequestReceived.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.accepted', this.#handleFriendRequestAccepted.bind(this), this)
		eventBus.subscribe('social.sent_friend_request.declined', this.#handleFriendRequestDeclined.bind(this), this)
		eventBus.subscribe('game.match_request.received', this.#handleMatchRequestReceived.bind(this), this)
	}

	cleanup() {
		eventBus.unsubscribe('social.friend_request.received', this)
		eventBus.unsubscribe('social.sent_friend_request.accepted', this)
		eventBus.unsubscribe('social.sent_friend_request.declined', this)
		eventBus.unsubscribe('game.match_request', this)
	}

	addNotification(notification) {
		this.#notificationStore.add(notification)
		this.#components.list.addNotification({
			notification,
			onDisplay: (notification) => { this.#components.display.open(notification) },
		})

		this.#showAlert()
	}

	removeNotification(notification) {
		this.#notificationStore.remove(notification)
		this.#components.list.removeNotification(notification)
	}

	#showAlert() {
		if (!this.#isOpen) this.#components.button.showNewNotification()
	}

	toggle() {
		this.#isOpen ? this.close() : this.open()
	}

	open() {
		this.#isOpen = true
		this.#components.list.show()
		this.#components.button.hideNewNotification()
		overlayManager.show(this)
	}

	close() {
		this.#isOpen = false
		this.#components.list.hide()
		overlayManager.hide()
	}

	#handleFriendRequestReceived({ user, timestamp }) {
		this.addNotification(new Notification({
			type: 'social.friend_request.received',
			message: `You received a friend request from ${user.username}`,
			user: user,
			timestamp: timestamp,
		}))
	}

	#handleFriendRequestAccepted({ user, timestamp }) {
		this.addNotification(new Notification({
			type: 'social.sent_friend_request.accepted',
			message: `${user.username} accepted your friend request.`,
			user: user,
			timestamp: timestamp,
		}))
	}

	#handleFriendRequestDeclined({ user, timestamp }) {
		this.addNotification(new Notification({
			type: 'social.sent_friend_request.declined',
			message: `${user.username} declined your friend request.`,
			user: user,
			timestamp: timestamp,
		}))
	}

	#handleMatchRequestReceived({ user, gameUuid, timestamp }) {
		this.addNotification(new Notification({
			type: 'game.match_request.received',
			message: `${user.username} has invited you to a single match.`,
			user,
			gameId: gameUuid,
			timestamp: timestamp,
		}))
	}
}

class NotificationStore {
	#notifications

	constructor() {
		try {
			this.#notifications = JSON.parse(localStorage.getItem('notifications')) || []
			this.#notifications = this.#notifications.map(n => new Notification(n))
		} catch (err) {
			this.#notifications = []
		}
	}

	get allNotifications() {
		return this.#notifications
	}

	add(notification) {
		this.#notifications.unshift(notification)
		this.#store()
	}

	remove(notification) {
		this.#notifications = this.#notifications.filter(n => n.id !== notification.id)
		this.#store()
	}

	#store() {
		localStorage.setItem('notifications', JSON.stringify(this.#notifications))
	}
}

class ButtonComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup({ onToggle }) {
		this.element.addEventListener('click', onToggle)
	}

	showNewNotification() {
		this.element.classList.add('has-new-notification')
		this.element.classList.add('shake')
		setTimeout(() => this.element.classList.remove('shake'), 1000)
	}

	hideNewNotification() {
		this.element.classList.remove('has-new-notification')
	}
}

class ListComponent {
	element

	#contentEl

	constructor(element) {
		this.element = element
		this.#contentEl = this.element.querySelector('#notifications-content')
	}

	setup({ initialNotifications, onDisplay }) {
		initialNotifications
			.concat()
			.reverse()
			.forEach(notification => this.addNotification({
				notification,
				onDisplay,
			}))
	}

	addNotification({ notification, onDisplay }) {
		const template = document.getElementById('notification-template').content.firstElementChild
		const notificationEl = template.cloneNode(true)

		const timestampEl = notificationEl.querySelector('[data-notification-timestamp]')
		const messageEl = notificationEl.querySelector('[data-notification-message]')
		const removeButtonEl = notificationEl.querySelector('[data-notification-remove-btn]')

		// set d'un nouvel attribut data-notification-id pour chaque notification (pour pouvoir delete)
		notificationEl.setAttribute('data-notification-id', notification.id)

		timestampEl.textContent = (new Date(notification.timestamp)).toLocaleString()
		messageEl.textContent = notification.message

		removeButtonEl.addEventListener('click', (event) => {
			event.stopPropagation()
			notificationsComponent.removeNotification(notification)
		})

		notificationEl.addEventListener('click', () => { onDisplay(notification) })

		this.#contentEl.prepend(notificationEl)
	}

	removeNotification(notification) {
		this.#contentEl.querySelector(`[data-notification-id="${notification.id}"]`)?.remove()
	}

	show() {
		this.element.classList.remove('hidden')
	}

	hide() {
		this.element.classList.add('hidden')
	}
}

class DisplayComponent {
	element

	#elements = {}
	#notification = null
	#abortController = null

	constructor(element) {
		this.element = element

		this.#elements.message = this.element.querySelector('[data-message]')
		this.#elements.acceptBtn = this.element.querySelector('[data-accept-btn]')
		this.#elements.declineBtn = this.element.querySelector('[data-decline-btn]')
		this.#elements.chatBtn = this.element.querySelector('[data-chat-btn]')
		this.#elements.profileBtn = this.element.querySelector('[data-profile-btn]')
		this.#elements.blockBtn = this.element.querySelector('[data-block-btn]')
		this.#elements.inviteBtn = this.element.querySelector('[data-invite-btn]')
	}

	open(notification) {
		this.#notification = notification

		overlayManager.show(this)
		this.element.classList.remove('hidden')

		this.#elements.message.textContent = notification.message

		switch (notification.type) {
			case 'social.friend_request.received': this.#displayFriendRequestReceived(); break;
			case 'social.sent_friend_request.accepted': this.#displayFriendRequestAccepted(); break;
			case 'game.match_request.received': this.#displayMatchRequest(); break;
			case 'game.tournament_request.received': this.#displayTournamentRequest(); break;
		}
	}

	close() {
		this.#notification = null
		this.element.classList.add('hidden')
		overlayManager.hide()

		this.#abortController?.abort()
		this.#abortController = null
		this.element
			.querySelectorAll(':scope button')
			.forEach(el => el.classList.add('hidden'))
	}

	#displayFriendRequestReceived() {
		// Display
		this.#elements.acceptBtn.classList.remove('hidden')
		this.#elements.declineBtn.classList.remove('hidden')
		this.#elements.blockBtn.classList.remove('hidden')

		// Events
		this.#abortController = new AbortController()
		this.#elements.acceptBtn.addEventListener('click', this.#handleAcceptFriendRequest.bind(this), { signal: this.#abortController.signal })
		this.#elements.declineBtn.addEventListener('click', this.#handleDeclineFriendRequest.bind(this), { signal: this.#abortController.signal })
		this.#elements.blockBtn.addEventListener('click', this.#handleBlockUser.bind(this), { signal: this.#abortController.signal })
	}

	#displayFriendRequestAccepted() {
		// Display
		this.#elements.chatBtn.classList.remove('hidden')
		this.#elements.profileBtn.classList.remove('hidden')
		this.#elements.inviteBtn.classList.remove('hidden')

		// Events
		this.#abortController = new AbortController()
		this.#elements.chatBtn.addEventListener('click', this.#handleChat.bind(this), { signal: this.#abortController.signal })
		this.#elements.profileBtn.addEventListener('click', this.#handleProfile.bind(this), { signal: this.#abortController.signal })
		this.#elements.inviteBtn.addEventListener('click', this.#handleInvite.bind(this), { signal: this.#abortController.signal })
	}

	#displayMatchRequest() {
		// Display
		this.#elements.acceptBtn.classList.remove('hidden')
		this.#elements.declineBtn.classList.remove('hidden')
		this.#elements.chatBtn.classList.remove('hidden')

		// Events
		this.#abortController = new AbortController()
		this.#elements.acceptBtn.addEventListener('click', this.#handleAcceptMatch.bind(this), { signal: this.#abortController.signal })
		this.#elements.declineBtn.addEventListener('click', this.#handleDeclineMatch.bind(this), { signal: this.#abortController.signal })
		this.#elements.chatBtn.addEventListener('click', this.#handleChat.bind(this), { signal: this.#abortController.signal })
	}

	#displayTournamentRequest() {
		// Display
		this.#elements.acceptBtn.classList.remove('hidden')
		this.#elements.declineBtn.classList.remove('hidden')
		this.#elements.chatBtn.classList.remove('hidden')

		// Events
		this.#abortController = new AbortController()
		this.#elements.acceptBtn.addEventListener('click', this.#handleAcceptTournament.bind(this), { signal: this.#abortController.signal })
		this.#elements.declineBtn.addEventListener('click', this.#handleDeclineTournament.bind(this), { signal: this.#abortController.signal })
		this.#elements.chatBtn.addEventListener('click', this.#handleChat.bind(this), { signal: this.#abortController.signal })
	}

	async #handleAcceptFriendRequest() {
		if (!this.#notification)
			return

		try {
			const user = this.#notification.user
			const message = await socialService.acceptFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.received_friend_request.accepted', { user })
			notificationsComponent.removeNotification(this.#notification)
			this.close()
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleDeclineFriendRequest() {
		if (!this.#notification)
			return

		try {
			const user = this.#notification.user
			const message = await socialService.declineFriendRequest(user.id)
			tempAlert.success(message)
			eventBus.trigger('social.received_friend_request.declined', { user })
			notificationsComponent.removeNotification(this.#notification)
			this.close()
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleBlockUser() {
		if (!this.#notification)
			return

		try {
			const user = this.#notification.user
			const message = await socialService.blockUser(user.id)
			tempAlert.success(message)
			if (user.relationship === 'friend')
				eventBus.trigger('social.friend.removed', { user })
			eventBus.trigger('social.block_user', { user })
			notificationsComponent.removeNotification(this.#notification)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	#handleChat() {
		if (!this.#notification)
			return

		const user = this.#notification.user
		notificationsComponent.removeNotification(this.#notification)
		this.close()
		chatComponent.open(user)
	}

	#handleProfile() {
		if (!this.#notification)
			return

		const user = this.#notification.user
		notificationsComponent.removeNotification(this.#notification)
		this.close()
		routerService.navigate(`/user-profile?user_id=${user.id}`)
	}

	#handleInvite() {
		const friend = this.#notification.user
		if (!friend.isConnected) {
			tempAlert.error('User is not connected')
			return
		}
		localStorage.setItem('opponent', JSON.stringify(friend))
		routerService.navigate(`/remote-match`)
		notificationsComponent.removeNotification(this.#notification)
		this.close()
	}

	#handleAcceptMatch() {
		if (!this.#notification)
			return

		const gameId = this.#notification.gameId

		if (gameId) {
			routerService.navigate(`/remote-match`)
			localStorage.setItem('gameId', gameId)
			localStorage.setItem('opponent', JSON.stringify(this.#notification.user))
			notificationsComponent.removeNotification(this.#notification)
			this.close()
		} else {
			tempAlert.warning('Game ID not found')
			notificationsComponent.removeNotification(this.#notification)
		}
	}

	async #handleDeclineMatch() {
		if (!this.#notification)
			return

		const gameId = this.#notification.gameId
		if (!gameId) {
			tempAlert.warning('Game ID not found')
			notificationsComponent.removeNotification(this.#notification)
			return
		}

		try {
			const message = await gameService.declineMatchRequest(gameId)
			tempAlert.success(message)
			notificationsComponent.removeNotification(this.#notification)
			this.close()
		} catch (err) {
			tempAlert.error(err)
		}
	}

	#handleAcceptTournament() {
		if (!this.#notification)
			return

		notificationsComponent.removeNotification(this.#notification)
	}

	#handleDeclineTournament() {
		if (!this.#notification)
			return

		notificationsComponent.removeNotification(this.#notification)
	}
}

export const notificationsComponent = new NotificationsComponent()