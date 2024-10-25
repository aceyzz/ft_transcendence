import { authService } from '../services/authService.js'
import { authRequirements } from "../utils/authRequirements.js"
import { tempAlert } from '../modules/tempAlert.js'
import { eventBus } from '../modules/eventBus.js'

export class UserRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/user.html'

	setup(container) {
		const user = authService.user

		const updateProfileFormComponent = new UpdateProfileFormComponent(container.querySelector(':scope #profile-form'))
		const updateAvatarFormComponent = new UpdateAvatarFormComponent(container.querySelector(':scope #avatar-form'))

		updateProfileFormComponent.setup(user)
		updateAvatarFormComponent.setup(user)
	}
}

class UpdateProfileFormComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup(user) {
		const firstNameEl = this.element.querySelector('#first_name')
		const lastNameEl = this.element.querySelector('#last_name')
		const usernameEl = this.element.querySelector('#username')
		const emailEl = this.element.querySelector('#email')

		firstNameEl.value = user.firstName || ''
		lastNameEl.value = user.lastName || ''
		usernameEl.value = user.username
		emailEl.value = user.email

		this.element.addEventListener('submit', this.#handleUpdateUser.bind(this))
	}

	async #handleUpdateUser(e) {
		e.preventDefault()

		const form = e.target
		const formData = new FormData(form)

		try {
			this.#checkAndSecureFormData(formData)
			const user = await authService.updateProfile(formData)
			tempAlert.success('User profile updated')
		} catch (err) {
			tempAlert.error(err)
			// TODO: Display form error messages
		}
	}

	#checkAndSecureFormData(formData) {
		const regexUsername = /^[a-zA-Z0-9_]{3,20}$/
		const regexName = /^[a-zA-Z]{2,20}$/
		const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
		
		const username = formData.get('username')
		const firstName = formData.get('first_name')
		const lastName = formData.get('last_name')
		const email = formData.get('email')

		if (!regexUsername.test(username))
			throw 'Invalid username. Must be 3-20 characters long and contain only letters, numbers, and underscores.'
		if (!regexName.test(firstName))
			throw 'Invalid first name. Must be 2-20 characters long and contain only letters.'
		if (!regexName.test(lastName))
			throw 'Invalid last name. Must be 2-20 characters long and contain only letters.'
		if (!regexEmail.test(email))
			throw 'Invalid email address.'
	}
}

class UpdateAvatarFormComponent {
	#defaultAvatar = '/static/assets/user_default.png'

	element
	avatarPreviewEl
	avatarInputEl
	user

	constructor(element = null) {
		this.element = element
	}

	setup(user) {
		this.user = user

		this.avatarPreviewEl = this.element.querySelector('#avatar-preview')
		this.avatarInputEl = this.element.querySelector('#avatar-input')
		const uploadBtn = this.element.querySelector('#upload-avatar-btn')
		const deleteBtn = this.element.querySelector('#delete-avatar-btn')

		this.avatarPreviewEl.src = user.avatar || this.#defaultAvatar

		uploadBtn.addEventListener('click', () => this.avatarInputEl.click())
		deleteBtn.addEventListener('click', this.#handleDeleteAvatar.bind(this))
		this.avatarInputEl.addEventListener('change', this.#handleChangeAvatar.bind(this))
	}

	#updateAvatarPreview(user) {
		this.avatarPreviewEl.src = user?.avatar ? `${user?.avatar}?${Date.now()}` : this.#defaultAvatar
	}

	async #handleChangeAvatar() {
		const file = this.avatarInputEl.files[0]
		if (!file)
			return

		if (!file.type.startsWith('image/')) {
			tempAlert.error("Invalid file type. Must be an image.")
			return
		}

		const formData = new FormData(this.element)

		try {
			const user = await authService.updateAvatar(formData)
			tempAlert.success('Avatar updated')
			this.#updateAvatarPreview(user)
		} catch (err) {
			tempAlert.error(err)
		}
	}

	async #handleDeleteAvatar() {
		try {
			const user = await authService.deleteAvatar()
			this.#updateAvatarPreview(user)
			tempAlert.success('Avatar updated')
		} catch (err) {
			tempAlert.error(err)
		}
	}
}