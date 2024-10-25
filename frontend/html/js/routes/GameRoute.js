import { tempAlert } from '../modules/tempAlert.js';
import { routerService } from '../services/routerService.js';
import { authRequirements } from '../utils/authRequirements.js';

const gameUrls = {
	'single-match': {
		local: '/local-match',
		remote: '/remote-match',
	},
	'tournament': {
		local: '/local-tournament',
		remote: '/'
	}
}

export class GameRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/game.html'
	#gameType = null
	#mode = null
	#startGameBtn
	#buttons = {}

	async setup(container) {
		this.#buttons.singleMatchBtn = container.querySelector('#single-match-btn');
		this.#buttons.tournamentBtn = container.querySelector('#tournament-btn');
		this.#buttons.localBtn = container.querySelector('#local-btn');
		this.#buttons.remoteBtn = container.querySelector('#remote-btn');
		this.#startGameBtn = container.querySelector('#start-game-btn');

		this.#buttons.singleMatchBtn.addEventListener('click', () => this.#selectMatchType());
		this.#buttons.tournamentBtn.addEventListener('click', () => this.#selectTournamentType());
		this.#buttons.localBtn.addEventListener('click', () => this.#selectLocalMode());
		this.#buttons.remoteBtn.addEventListener('click', () => this.#selectRemoteMode());

		this.#startGameBtn.addEventListener('click', this.#startGame.bind(this));
	}

	#selectMatchType() {
		this.#gameType = 'single-match';
		this.#buttons.singleMatchBtn.classList.add('active');
		this.#buttons.tournamentBtn.classList.remove('active');

		this.#buttons.remoteBtn.disabled = false;
		this.#buttons.remoteBtn.classList.remove('disabled');
		
		this.#checkStartCondition();
	}

	#selectTournamentType() {
		this.#gameType = 'tournament';
		this.#buttons.tournamentBtn.classList.add('active');
		this.#buttons.singleMatchBtn.classList.remove('active');

		this.#selectLocalMode();
		this.#buttons.remoteBtn.disabled = true;
		this.#buttons.remoteBtn.classList.add('disabled');
		this.#checkStartCondition();
	}

	#selectLocalMode() {
		this.#mode = 'local';
		this.#buttons.localBtn.classList.add('active');
		this.#buttons.remoteBtn.classList.remove('active');
		this.#checkStartCondition();
	}

	#selectRemoteMode() {
		this.#mode = 'remote';
		this.#buttons.remoteBtn.classList.add('active');
		this.#buttons.localBtn.classList.remove('active');
		this.#checkStartCondition();
	}

	#checkStartCondition() {
		if (this.#gameType && this.#mode)
			this.#startGameBtn.disabled = false;
		else
			this.#startGameBtn.disabled = true;
	}

	#startGame() {
		const url = gameUrls[this.#gameType]?.[this.#mode]

		if (url)
			routerService.navigate(url);
		else
			tempAlert.warning('Please select game type and mode');
	}
}