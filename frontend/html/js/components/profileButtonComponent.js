import { routerService } from "../services/routerService.js"
import { eventBus } from "../modules/eventBus.js"
import { authService } from "../services/authService.js"

class ProfileButtonComponent {
	element
	#defaultAvatarUrl = "/static/assets/user_default.png"

	setup(element) {
		this.element = element

		eventBus.subscribe('auth.login', this.#setAvatarIcon.bind(this))
		eventBus.subscribe('auth.logout', this.#setAvatarIcon.bind(this))
		eventBus.subscribe('auth.profile_updated', this.#setAvatarIcon.bind(this))

		this.element.addEventListener('click', this.#openProfile.bind(this))
	}

	#setAvatarIcon() {
		const iconEl = this.element.querySelector("#profile-btn-icon")
		iconEl.src = authService.user?.avatar ? `${authService.user?.avatar}?${Date.now()}` : this.#defaultAvatarUrl
	}

	#openProfile(event) {
		event.preventDefault()
		routerService.navigate('/user')
	}
}

export const profileButtonComponent = new ProfileButtonComponent()

/*

<a data-route href="/user" id="profile-button" class="logged-out-hide">
	<img src="/static/assets/settings.png" alt="Edit Profile" id="profile-btn-icon">
</a>

*/