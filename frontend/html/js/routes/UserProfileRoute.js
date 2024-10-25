import { userService } from '../services/userService.js';
import { statsService } from '../services/statsService.js';
import { authRequirements } from '../utils/authRequirements.js';
import { MatchListComponent } from '../components/matchComponent.js';
import { authService } from '../services/authService.js';
import { routerService } from '../services/routerService.js';
import { socialService } from '../services/socialService.js';
import { tempAlert } from '../modules/tempAlert.js';
import { eventBus } from '../modules/eventBus.js';
import { chatComponent } from '../components/chatComponent.js';

const RELATION_ACTIONS_MAP = {
	'none': ['add-friend', 'block-user'],
	'friend': ['chat', 'invite-play', 'remove-friend', 'block-user'],
	'friend_request_sent': ['cancel-friend-request'],
	'friend_request_received': ['accept-friend', 'decline-friend', 'block-user'],
	'blocked': ['unblock-user'],
};

export class UserProfileRoute {
	authentication = authRequirements.loginRequired;
	partial = 'partials/user-profile.html';

	async setup(container) {
		const userId = (new URLSearchParams(window.location.search)).get('user_id');
		const selfUserId = authService.user.id;

		if (Number(userId) === Number(selfUserId)) {
			routerService.navigate('/dashboard');
			return;
		}

		const user = await userService.getUser(userId);
		const stats = await statsService.getUserStats(userId);
		const matches = await statsService.listMatches(userId, 1000);

		const userInfoComponent = new UserInfoComponent(container.querySelector(':scope #user-info'));
		const statsComponent = new StatsComponent(container.querySelector('#stats'));
		const matchListComponent = new MatchListComponent(container.querySelector(':scope #recent-matches'));
		const actionButtonComponent = new ActionButtonComponent(container.querySelector('.user-action-buttons-container'));

		userInfoComponent.setup(user);
		statsComponent.setup(stats);
		matchListComponent.setup(matches.data, user);
		actionButtonComponent.setup(user);
	}
}

class UserInfoComponent {
	element;

	constructor(element) {
		this.element = element;
	}

	setup(user) {
		const imgEl = this.element.querySelector('[data-avatar]');
		const usernameEl = this.element.querySelector('[data-username]');

		if (user.avatar) {
			imgEl.src = user.avatar;
		}
		imgEl.alt = `Avatar ${user.username}`;
		usernameEl.textContent = user.username;
	}
}

class StatsComponent {
	element;

	constructor(element) {
		this.element = element;
	}

	setup(stats) {
		const ratio = stats.losses === 0 ? stats.wins : (stats.wins / stats.losses);

		const winsEl = this.element.querySelector('[data-wins]');
		const lossesEl = this.element.querySelector('[data-losses]');
		const ratioEl = this.element.querySelector('[data-ratio]');

		winsEl.textContent = stats.wins;
		lossesEl.textContent = stats.losses;
		ratioEl.textContent = ratio.toFixed(2);
	}
}

class ActionButtonComponent {
	element;
	user;

	constructor(element) {
		this.element = element;
	}

	setup(user) {
		this.user = user

		// Elements
		const addFriendButtonEl = this.element.querySelector('[data-add-friend-btn]')
		const removeFriendButtonEl = this.element.querySelector('[data-remove-friend-btn]')
		const blockUserButtonEl = this.element.querySelector('[data-block-user-btn]')
		const invitePlayButtonEl = this.element.querySelector('[data-invite-play-btn]')
		const chatButtonEl = this.element.querySelector('[data-chat-btn]')
		const acceptFriendButtonEl = this.element.querySelector('[data-accept-friend-btn]')
		const declineFriendButtonEl = this.element.querySelector('[data-decline-friend-btn]')
		const cancelFriendRequestButtonEl = this.element.querySelector('[data-cancel-friend-request-btn]')
		const unblockUserButtonEl = this.element.querySelector('[data-unblock-user-btn]')

		// Events
		addFriendButtonEl.addEventListener('click', this.#handleAddFriend.bind(this, this.user))
		removeFriendButtonEl.addEventListener('click', this.#handleRemoveFriend.bind(this, this.user))
		blockUserButtonEl.addEventListener('click', this.#handleBlockUser.bind(this, this.user))
		invitePlayButtonEl.addEventListener('click', this.#handleInvitePlay.bind(this, this.user))
		chatButtonEl.addEventListener('click', this.#handleChat.bind(this, this.user))
		acceptFriendButtonEl.addEventListener('click', this.#handleAcceptFriend.bind(this, this.user))
		declineFriendButtonEl.addEventListener('click', this.#handleDeclineFriend.bind(this, this.user))
		cancelFriendRequestButtonEl.addEventListener('click', this.#handleCancelFriendRequest.bind(this, this.user))
		unblockUserButtonEl.addEventListener('click', this.#handleUnblockUser.bind(this, this.user))

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

		this.#displayForRelationship(user.relationship)
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

	#displayForRelationship(relationship) {
		this.element.querySelectorAll('button').forEach(el => el.classList.add('hidden'))

		const visibleButtonTags = RELATION_ACTIONS_MAP[relationship || 'none'] || [];
		visibleButtonTags
			.forEach(tag =>
				this.element.querySelector(`button[data-${tag}-btn`)?.classList.remove('hidden')
			)
	}

	#handleEvent(relationship, { user }) {
		if (this.user.id === user.id)
			this.#displayForRelationship(relationship)
	}

	async #handleAddFriend(user) {
		try {
			const message = await socialService.sendFriendRequest(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.friend_request.sent', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleAcceptFriend(user) {
		try {
			const message = await socialService.acceptFriendRequest(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.received_friend_request.accepted', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleDeclineFriend(user) {
		try {
			const message = await socialService.declineFriendRequest(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.received_friend_request.declined', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleCancelFriendRequest(user) {
		try {
			const message = await socialService.cancelFriendRequest(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.sent_friend_request.canceled', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleRemoveFriend(user) {
		try {
			const message = await socialService.removeFriend(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.friend.removed', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleBlockUser(user) {
		try {
			const message = await socialService.blockUser(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.block_user', { user });
		} catch (err) {
			tempAlert.error(err);
		}
	}

	async #handleUnblockUser(user) {
		try {
			const message = await socialService.unblockUser(user.id);
			tempAlert.success(message);
			eventBus.trigger('social.unblock_user', { user });
		} catch (err) {
			tempAlert.error(err);
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
		chatComponent.open(user);
	}
}