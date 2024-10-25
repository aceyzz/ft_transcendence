import { tempAlert } from '../modules/tempAlert.js';
import { authRequirements } from '../utils/authRequirements.js';
import { authService } from '../services/authService.js';
import { routerService } from '../services/routerService.js';
import { LocalGameComponent } from '../components/LocalGameComponent.js';

export class LocalMatchRoute {
	authentication = authRequirements.loginRequired;
	partial = 'partials/local-match.html';

	#components = {}

	setup(container) {
		this.#components.registerPlayer = new RegisterPlayerComponent(container.querySelector('#register-player-popup'))
		this.#components.game = new LocalGameComponent(container.querySelector('[data-game-container]'))

		this.#components.registerPlayer.setup((player2Name) => this.#stateStartGame(player2Name))
		this.#components.game.setup(() => routerService.navigate('/game'))

		this.#stateRegisterPlayer()
	}

	cleanup() {
		Object.values(this.#components).forEach(component => component.cleanup?.())
	}

	#stateRegisterPlayer() {
		this.#components.registerPlayer.show()
	}

	#stateStartGame(player2Name) {
		this.#components.registerPlayer.hide()

		this.#components.game.show()
		this.#components.game.start(authService.user, { username: player2Name })
	}
}

class RegisterPlayerComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(onRegistered) {
		const form = this.element.querySelector('form')
		form.addEventListener('submit', this.#handleRegisterPlayer.bind(this, onRegistered))
	}

	show() {
		this.element.classList.remove('hidden');
	}

	hide() {
		this.element.classList.add('hidden');
	}

	#handleRegisterPlayer(onRegistered, e) {
		e.preventDefault();

		const formData = new FormData(e.target);
		const player2Name = formData.get('player2-name').trim();

		if (!player2Name) {
			tempAlert.warning('Please enter a valid username');
			return;
		}

		onRegistered(player2Name)
	}
}
