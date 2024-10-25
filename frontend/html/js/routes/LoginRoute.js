import { authService } from '../services/authService.js'
import { routerService } from '../services/routerService.js'
import { ValidationListError } from '../utils/errors.js'
import { errorMessage } from '../modules/components.js'
import { authRequirements } from '../utils/authRequirements.js'
import { tempAlert } from '../modules/tempAlert.js'

export class LoginRoute {
	authentication = authRequirements.logoutRequired
	partial = 'partials/login.html'

	setup(container) {
		const loginFormComponent = new LoginFormComponent(container.querySelector('#login-form'))

		loginFormComponent.setup()
	}
}

class LoginFormComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup() {
		this.element.addEventListener('submit', this.#handleLogin.bind(this))
	}

	async #handleLogin(e) {
		e.preventDefault()

		const form = e.target
		const formData = new FormData(form)

		try {
			await authService.login(formData)
			routerService.navigate('/dashboard')
			tempAlert.success('Welcome to your dashboard!')
		} catch (err) {
			if (err instanceof ValidationListError)
				this.#displayErrorMessage(err.message)
			else {
				this.#displayErrorMessage("There was an error when logging in.")
			}
		}
	}

	#displayErrorMessage(message) {
		const existingAlerts = this.element.querySelectorAll('.alert.alert-danger');
		existingAlerts.forEach(alert => alert.remove());

		const input = this.element.querySelector(`#password`);
		errorMessage(input, message);
	}
}