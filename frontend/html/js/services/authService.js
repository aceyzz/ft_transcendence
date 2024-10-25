import * as api from '../utils/api.js'
import { eventBus } from "../modules/eventBus.js"
import { User } from '../models/User.js'

class AuthService {
	#user = null

	updateUser(user) {
		this.#user = user

		if (this.#user)
			eventBus.trigger('auth.login', { user: this.#user })
		else
			eventBus.trigger('auth.logout')
	}

	async login(formData) {
		const json = await api.post('/myauth/login/', formData)
		this.#user = new User(json.data.user)
		api.updateCsrfCookie(json.data.csrftoken)
		eventBus.trigger('auth.login', { user: this.#user })
		return this.#user
	}

	async logout() {
		const json = await api.post('/myauth/logout/')
		this.#user = null
		eventBus.trigger('auth.logout')
	}

	async signup(formData) {
		const json = await api.post('/myauth/signup/', formData)
		this.#user = new User(json.data.user)
		eventBus.trigger('auth.login', { user: this.#user })
		api.updateCsrfCookie(json.data.csrftoken)
		return this.#user
	}

	async updateAvatar(formData) {
		const json = await api.put('/myauth/profile/avatar/', formData)

		this.#user = new User(json.data.user)
		eventBus.trigger('auth.profile_updated', { user: this.#user })
		return this.#user
	}

	async deleteAvatar() {
		const json = await api.destroy('/myauth/profile/avatar/')

		this.#user = new User(json.data.user)
		eventBus.trigger('auth.profile_updated', { user: this.#user })
		return this.#user
	}

	async updateProfile(formData) {
		const json = await api.put('/myauth/profile/', formData)

		this.#user = new User(json.data.user)
		eventBus.trigger('auth.profile_updated', { user: this.#user })
		return this.#user
	}

	async updatePassword(formData) {
		const json = await api.put('/myauth/password/', formData)
		return json.message
	}

	get user() {
		return this.#user
	}

	isLoggedIn() {
		return this.#user !== null
	}
}

export const authService = new AuthService()