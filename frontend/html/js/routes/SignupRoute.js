import { authService } from '../services/authService.js'
import { ValidationListError } from '../utils/errors.js'
import { errorMessage } from '../modules/components.js'
import { authRequirements } from '../utils/authRequirements.js'
import { routerService } from '../services/routerService.js'
import { tempAlert } from '../modules/tempAlert.js'

export class SignupRoute {
	authentication = authRequirements.logoutRequired
	partial = 'partials/signup.html'

	setup(container) {
		const signupFormComponent = new SignupFormComponent(container.querySelector('#signup-form'))

		signupFormComponent.setup()
	}
}

class SignupFormComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup() {
		this.element.addEventListener('submit', this.#handleSignup.bind(this))
	}

	async #handleSignup(e) {
		e.preventDefault()

		const form = e.target
		const formData = new FormData(form)

		try {
			await authService.signup(formData)
			routerService.navigate('/dashboard')
			tempAlert.success('Welcome to your dashboard!')
		} catch (err) {
			if (err instanceof ValidationListError)
				this.#displayErrorMessage(err.errors)
			else {
				this.#displayErrorMessage("There was an error when signing up.")
			}
		}
	}

	#displayErrorMessage(errors) {
		const existingAlerts = this.element.querySelectorAll('.alert.alert-danger');
		existingAlerts.forEach(alert => alert.remove());

		for (const [field, messages] of Object.entries(errors)) {
			const input = this.element.querySelector(`[name="${field}"]`);
			if (input) {
				errorMessage(input, messages);
			}
		}
	}
}