import { authRequirements } from '../utils/authRequirements.js';
import { emptyComponent } from '../modules/components.js';
import { authService } from '../services/authService.js';
import { socialService } from '../services/socialService.js';
import { statsService } from '../services/statsService.js';
import { routerService } from '../services/routerService.js';
import { MatchListComponent } from '../components/matchComponent.js';
import { notificationsComponent } from '../components/notificationsComponent.js';
import { eventBus } from '../modules/eventBus.js';
import { tempAlert } from '../modules/tempAlert.js';
import { chatComponent } from '../components/chatComponent.js';

export class DashboardRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/dashboard.html';
	#components = {}

	async setup(container) {
		// Load data
		const user = authService.user
		const friends = await socialService.listFriends(user.id, 3);
		const matches = await statsService.listMatches(user.id, 3);

		// Create components
		this.#components.logoutButton = new LogoutButtonComponent(container.querySelector(':scope #logout'))
		this.#components.userInfo = new UserInfoComponent(container.querySelector(':scope #user-info'))
		this.#components.friendList = new FriendListComponent(container.querySelector(':scope #friends-list'))
		this.#components.matchList = new MatchListComponent(container.querySelector(':scope #recent-matches'))

		// Setup components
		this.#components.logoutButton.setup()
		this.#components.userInfo.setup(user)
		this.#components.friendList.setup(friends.data)
		this.#components.matchList.setup(matches.data, user)
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}
}

class LogoutButtonComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup() {
		this.element.addEventListener('click', this.#handleLogout.bind(this))
	}

	async #handleLogout(e) {
		try {
			await authService.logout();
			routerService.navigate('/')
		} catch (err) {
			tempAlert.error(err)
		}
	}
}

class UserInfoComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup(user) {
		this.element.querySelector("#user-fullname").textContent = user.fullName
		this.element.querySelector("#user-username").textContent = `${user.username}`;
		if (user.avatar)
			this.element.querySelector("#user-avatar").src = user.avatar;
		else
			this.element.querySelector("#user-avatar").src = "/static/assets/user_default.png";
	}
}

class FriendListComponent {
	element

	#components = []

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
		eventBus.unsubscribe('social.friend.connected', this)
		eventBus.unsubscribe('social.friend.disconnected', this)
	}

	#addFriend(user) {
		const friendComponent = new FriendComponent(user)
		friendComponent.setup()
		this.element.appendChild(friendComponent.element)
		this.#components.push(friendComponent)
	}

	#removeFriend(user) {
		const index = this.#components.findIndex(component => component.friend.id === user.id)
		if (index < 0)
			return

		this.#components[index].remove()
		this.#components.splice(index, 1)
	}

	#renderFriendList(friends) {
		this.element.innerHTML = ''

		friends.forEach(friend => this.#addFriend(friend))
	}

	#handleFriendRemoved({ user }) {
		this.#removeFriend(user)
	}

	#handleSentFriendRequestAccepted({ user }) {
		if (this.#components.length > 2)
			this.#removeFriend(this.#components[this.#components.length - 1].friend)

		this.#addFriend(user)
	}

	#handleReceivedFriendRequestAccepted({ user }) {
		if (this.#components.length > 2)
			this.#removeFriend(this.#components[this.#components.length - 1].friend)

		this.#addFriend(user)
	}

	#handleFriendConnected({ user }) {
		const index = this.#components.findIndex(component => component.friend.id === user.id)

		if (index > -1)
			this.#components[index].setConnected()
	}

	#handleFriendDisconnected({ user }) {
		const index = this.#components.findIndex(component => component.friend.id === user.id)

		if (index > -1)
			this.#components[index].setDisconnected()
	}

}

class FriendComponent {
	element
	friend

	constructor(friend) {
		this.element = document.getElementById('friend-template').content.firstElementChild.cloneNode(true)
		this.friend = friend;
	}

	setup() {
		// Elements
		if (this.friend.isConnected) {
			this.setConnected()
		}
		const imgEl = this.element.querySelector('img[data-friend-img]')
		const usernameEl = this.element.querySelector('[data-friend-username]')
		const userProfileEl = this.element.querySelector('[data-user-profile-btn]')
		const chatButtonEl = this.element.querySelector('button[data-chat-btn]')
		const battleButtonEl = this.element.querySelector('button[data-battle-btn]')

		// Display
		if (this.friend.avatar) {
			imgEl.src = this.friend.avatar
			imgEl.alt = `Avatar ${this.friend.username}`
		}
		usernameEl.textContent = this.friend.username

		// Events
		userProfileEl.addEventListener('click', () => routerService.navigate(`/user-profile?user_id=${this.friend.id}`))
		chatButtonEl.addEventListener('click', () => chatComponent.open(this.friend))
		battleButtonEl.addEventListener('click', () => {
			if (!this.friend.isConnected) {
				tempAlert.error('User is not connected')
				return
			}
			localStorage.setItem('opponent', JSON.stringify(this.friend))
			routerService.navigate(`/remote-match`)
		});
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
}