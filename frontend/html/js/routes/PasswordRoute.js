import { tempAlert } from '../modules/tempAlert.js';
import { authService } from '../services/authService.js'
import { authRequirements } from '../utils/authRequirements.js';

export class PasswordRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/password.html'

	setup(container) {
		// Create components
		const passwordFormComponent = new PasswordFormComponent(container.querySelector(':scope #password-form'))

		// Setup components
		passwordFormComponent.setup()
	}
}

class PasswordFormComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup() {
		// Events
		this.element.addEventListener('submit', this.#handleUpdatePassword.bind(this))
	}

	async #handleUpdatePassword(e) {
		e.preventDefault()

		const form = e.target
		const formData = new FormData(form)

		try {
			const message = await authService.updatePassword(formData)
			tempAlert.success(message)
			this.#resetForm()
		} catch (err) {
			tempAlert.error(err)
			// TODO: Display form errors
		}
	}

	#resetForm() {
		this.element.reset()
	}
}