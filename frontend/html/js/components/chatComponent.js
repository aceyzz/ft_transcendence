import { authService } from '../services/authService.js'
import { socialService } from '../services/socialService.js'
import { chatService } from '../services/chatService.js'
import { notificationsComponent } from './notificationsComponent.js'
import { overlayManager } from '../modules/overlayManager.js'
import { searchComponent } from './searchComponent.js'
import { tempAlert } from '../modules/tempAlert.js'
import { eventBus } from '../modules/eventBus.js'
import { routerService } from '../services/routerService.js'

class ChatComponent {
	#isOpen = false
	#components = {}
	#messages = new Map()

	constructor() {}

	async setup(buttonEl, containerEl) {
		this.#components.button = new ButtonComponent(buttonEl)
		this.#components.container = new ContainerComponent(containerEl)
		this.#components.userSearch = new UserSearchComponent(containerEl.querySelector(':scope #user-search'))
		this.#components.userList = new UserListComponent(containerEl.querySelector(':scope #user-list'))
		this.#components.messageForm = new MessageFormComponent(containerEl.querySelector(':scope #chat-message-form'))
		this.#components.messageList = new MessageListComponent(containerEl.querySelector(':scope #message-list'))

		this.#components.button.setup()
		this.#components.userSearch.setup()
		this.#components.messageForm.setup((message) => this.#handleMessageSent(message))

		eventBus.subscribe('auth.login', this.#handleLogin.bind(this))
		eventBus.subscribe('auth.logout', this.#handleLogout.bind(this))
		eventBus.subscribe('chat.message_received', this.#handleMessageReceived.bind(this))
		eventBus.subscribe('social.friend.removed', this.#handleFriendRemoved.bind(this))
		eventBus.subscribe('social.sent_friend_request.accepted', this.#handleFriendRequestAccepted.bind(this))
		eventBus.subscribe('social.received_friend_request.accepted', this.#handleFriendRequestAccepted.bind(this))
		eventBus.subscribe('social.friend.connected', this.#handleIsConnected.bind(this))
		eventBus.subscribe('social.friend.disconnected', this.#handleIsDisonnected.bind(this))
	}

	toggle() {
		this.#isOpen ? this.close() : this.open()
	}

	async open(user = null) {
		this.#isOpen = true
		this.#components.button.hideNewMessage()
		overlayManager.show(this)
		this.#components.container.show()
		this.#components.userSearch.focus()

		if (user) {
			this.selectUser(user, true)
		}
	}

	close() {
		this.#isOpen = false
		overlayManager.hide()
		this.#components.container.hide()
		this.#components.userSearch.clear()
		this.#components.userList.selectUser(null)
	}

	setUserFilter(searchTerm) {
		this.#components.userList.setFilter(searchTerm)
	}

	async selectUser(user, resetFilter = false) {
		if (resetFilter) this.#components.userSearch.clear()
		this.#components.userList.selectUser(user, resetFilter)
		this.#components.messageForm.setUser(user)
		this.#components.messageForm.focus()
		this.#components.messageList.setUser(user, await this.#getMessages(user))
	}

	#handleMessageSent({ toUser, formattedMessage }) {
		if (!formattedMessage || !formattedMessage.text || formattedMessage.text.trim() === '') {
			tempAlert.error("Message content is missing.");
			return;
		}

		if (!this.#messages.has(toUser.id)) {
			this.#messages.set(toUser.id, []);
		}
		this.#messages.get(toUser.id).push(formattedMessage);
		this.#components.messageList.addMessage(toUser, formattedMessage);
	}

	async #handleLogin({ user }) {
		try {
			const friends = await socialService.listFriends(user.id, 1000)
			this.#components.userList.setUsers(friends.data)
		} catch (err) {
			tempAlert.error(err)
			this.#components.userList.setUsers([])
		}
	}

	#handleFriendRemoved({ user }) {
		this.#components.userList.removeUser(user)
		this.#components.messageList.unsetUser(user)
	}

	#handleFriendRequestAccepted({ user }) {
		this.#components.userList.addUser(user)
	}

	#handleLogout() {
		this.#components.userSearch.clear()
		this.#components.userList.setUsers()
		this.#components.messageForm.setUser()
		this.#components.messageList.setUser()
	}

	#handleMessageReceived({ message }) {
		const user = message.fromUser.id === authService.user.id ? message.toUser : message.fromUser

		if (!this.#isOpen) this.#components.button.showNewMessage()

		if (!this.#messages.has(user.id)) {
			this.#messages.set(user.id, [])
		}
		this.#messages.get(user.id).push(message)
		this.#components.messageList.addMessage(user, message)
	}

	async #getMessages(user) {
		if (!user) return []

		if (!this.#messages.has(user.id)) {
			const messages = await chatService.listMessages(user.id, 1000)
			this.#messages.set(user.id, messages.data)
		}
		return this.#messages.get(user.id)
	}

	#handleIsConnected({ user }) {
		const userId = user.id
		const userElement = this.#components.userList.element.querySelector(`.conversation-item[data-user-id="${userId}"]`)
		userElement.querySelector('[data-status]').classList.remove('is-disconnected')
		userElement.querySelector('[data-status]').classList.add('is-connected')
	}

	#handleIsDisonnected({ user }) {
		const userId = user.id
		const userElement = this.#components.userList.element.querySelector(`.conversation-item[data-user-id="${userId}"]`)
		userElement.querySelector('[data-status]').classList.add('is-disconnected')
		userElement.querySelector('[data-status]').classList.remove('is-connected')
	}
}

class ButtonComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup() {
		this.element.addEventListener('click', () => chatComponent.toggle())
	}

	showNewMessage() {
		this.element.classList.add('has-new-notification')
		this.element.classList.add('shake')
		setTimeout(() => this.element.classList.remove('shake'), 1000)
	}

	hideNewMessage() {
		this.element.classList.remove('has-new-notification')
	}
}

class ContainerComponent {
	element

	constructor(element) {
		this.element = element
	}

	show() {
		this.element.classList.remove('hidden')
	}

	hide() {
		this.element.classList.add('hidden')
	}
}

class UserSearchComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup() {
		this.element.addEventListener('input', (e) => chatComponent.setUserFilter(e.target.value.trim()))
	}

	clear() {
		this.element.value = ''
	}

	focus() {
		this.element.select()
	}
}

class UserListComponent {
	element

	#users = []
	#filter = ''
	#selectedUser = null

	constructor(element) {
		this.element = element
	}

	setUsers(users = []) {
		this.#users = users
		this.#renderUsers()
	}

	setFilter(filter = '') {
		this.#filter = filter
		this.#renderUsers()
	}

	addUser(user) {
		this.#users.push(user)
		this.#renderUsers()
	}

	removeUser(user) {
		this.#users = this.#users.filter((u) => u.id !== user.id)
		this.#renderUsers()
	}

	selectUser(user = null, resetFilter = false) {
		this.#selectedUser = user
		if (resetFilter) this.#filter = ''
		this.#renderUsers()
	}

	#renderUsers() {
		this.element.innerHTML = ''
		const displayedUsers = this.#users.filter((u) => u.username.indexOf(this.#filter) === 0)

		displayedUsers.forEach((user) => {
			const template = document.getElementById('conversation-template').content.cloneNode(true)
			const userElement = template.querySelector('.conversation-item')
			userElement.setAttribute('data-user-id', user.id)
			if (user.id === this.#selectedUser?.id) userElement.classList.add('selected')

			const avatarElement = userElement.querySelector('[data-avatar]')
			avatarElement.src = user.avatar || '/static/assets/user-default.png'
			avatarElement.alt = `${user.username}'s avatar`

			const usernameElement = userElement.querySelector('[data-username]')
			usernameElement.textContent = user.username

			const isConnectedElement = userElement.querySelector('.is-connected')
			user.isConnected ? isConnectedElement.classList.add('is-connected') : isConnectedElement.classList.add('is-disconnected')

			userElement.addEventListener('click', () => chatComponent.selectUser(user))

			this.element.appendChild(userElement)
		})
	}
}

class MessageFormComponent {
	element

	#elements = {}
	#selectedUser = null
	#onMessageSent

	constructor(element) {
		this.element = element
		this.#elements.text = this.element.querySelector(':scope #chat-message-input')
		this.#elements.toUser = this.element.querySelector(':scope [name="to_user"]')
		this.#elements.inviteBattle = this.element.querySelector(':scope [data-invite-battle-btn]')
	}

	setup(onMessageSent) {
		this.#onMessageSent = onMessageSent
		this.element.addEventListener('submit', this.#handleSendMessage.bind(this))
		this.#elements.inviteBattle.addEventListener('click', this.#handleInviteBattle.bind(this))
	}

	focus() {
		this.#elements.text.focus()
	}

	setUser(user = null) {
		this.#selectedUser = user
		if (user) {
			this.#elements.toUser.value = user.id
			this.#elements.text.focus()
			this.element.classList.remove('hidden')
		} else {
			this.#elements.toUser.value = ''
			this.element.classList.add('hidden')
		}
	}

	unsetUser(user) {
		if (user.id === this.#selectedUser.id) this.setUser()
	}

	async #handleSendMessage(e) {
		e.preventDefault();
	
		if (!this.#selectedUser) return;
	
		const form = e.target;
		const formData = new FormData(form);
	
		const text = this.#elements.text.value.trim();
		if (text === '') {
			tempAlert.error("Message content is missing.");
			return;
		}
		formData.set('text', text);
	
		try {
			const message = await chatService.sendMessage(formData);
			this.#elements.text.value = '';
	
			const formattedMessage = {
				text,
				fromUser: authService.user,
				toUser: this.#selectedUser,
				timestamp: new Date().toISOString(),
			};
			this.#onMessageSent({ toUser: this.#selectedUser, formattedMessage });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	#handleInviteBattle(e) {
		e.preventDefault();
		const user = this.#selectedUser;
		if (!user) {
			tempAlert.error('Please select a user to invite to a battle.');
			return ;
		}
		if (!user.isConnected) {
			tempAlert.error('User is not connected')
			return ;
		}
		localStorage.setItem('opponent', JSON.stringify(user))
		routerService.navigate(`/remote-match`)
	}
}

class MessageListComponent {
	element

	#selectedUser = null

	constructor(element) {
		this.element = element
	}

	setUser(user = null, messages = []) {
		this.#selectedUser = user
		this.element.innerHTML = ''
		messages.forEach((message) => {
			this.element.appendChild(this.#renderMessage(message))
		})
		const scrollBehavior = this.element.style.scrollBehavior
		this.element.style.scrollBehavior = 'auto'
		this.element.scrollTop = this.element.scrollHeight
		this.element.style.scrollBehavior = scrollBehavior
	}

	unsetUser(user) {
		if (user.id === this.#selectedUser?.id) this.setUser()
	}

	addMessage(user, message) {
		if (user.id !== this.#selectedUser?.id) return
		this.element.appendChild(this.#renderMessage(message))
		this.element.scrollTop = this.element.scrollHeight
	}

	#renderMessage(message) {
		const selfUser = authService.user
		const element = document.getElementById('chat-msg-template').content.firstElementChild.cloneNode(true)

		const contentEl = element.querySelector('[data-content]')
		const senderEl = element.querySelector('[data-sender]')
		const timestampEl = element.querySelector('[data-timestamp]')

		if (message.fromUser.id === selfUser.id) element.classList.add('my-message')
		else element.classList.add('friend-message')

		contentEl.textContent = message.text
		senderEl.textContent = message.fromUser.username
		timestampEl.textContent = new Date(message.timestamp).toLocaleString()

		return element
	}
}

export const chatComponent = new ChatComponent()