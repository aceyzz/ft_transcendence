import { tempAlert } from '../modules/tempAlert.js';
import { authRequirements } from '../utils/authRequirements.js'
import { Tournament } from '../models/Tournament.js';
import { authService } from '../services/authService.js';
import { LocalGameComponent } from '../components/LocalGameComponent.js';
import { routerService } from '../services/routerService.js';

export class LocalTournamentRoute {
	#components = {}

	authentication = authRequirements.loginRequired
	partial = 'partials/tournament.html'
	tournament = null

	setup(container) {
		this.tournament = new Tournament(8)

		this.#components.addPlayers = new AddPlayersComponent(container.querySelector('#add-players'))
		this.#components.matchList = new MatchListComponent(container.querySelector('#match-list'))
		this.#components.game = new LocalGameComponent(container.querySelector('#game-container'), false)
		this.#components.tournamentResult = new TournamentResultComponent(container.querySelector('#tournament-result'))

		this.#components.addPlayers.setup(this.tournament, () => this.#stateTournament())
		this.#components.matchList.setup(() => this.#stateGame())
		this.#components.game.setup((gameResult) => this.#handleGameFinished(gameResult))

		this.#stateAddPlayers()
	}

	#stateAddPlayers() {
		this.#components.addPlayers.show()
	}

	#stateTournament() {
		this.#components.addPlayers.hide()
		this.#components.game.hide()

		this.#components.matchList.show(this.tournament)
	}

	#stateGame() {
		this.#components.matchList.hide()

		const currentPairing = this.tournament.currentPairing
		this.#components.game.show()
		this.#components.game.start({ username: currentPairing.player1 }, { username: currentPairing.player2 })
	}

	#stateResult() {
		this.#components.game.hide()
		this.#components.tournamentResult.show(this.tournament.winner, () => routerService.navigate('/game'))
	}

	#handleGameFinished(gameResult) {
		this.tournament.setScore(gameResult.player1Score, gameResult.player2Score)

		if (this.tournament.isFinished)
			this.#stateResult(gameResult)
		else
			this.#stateTournament()
	}
}

class AddPlayersComponent {
	element

	#elements = {}
	#tournament

	constructor(element) {
		this.element = element

		this.#elements.form = this.element.querySelector('[data-player-name-form]')
		this.#elements.input = this.element.querySelector('input')
		this.#elements.playerList = this.element.querySelector('[data-player-list]')
		this.#elements.startGameBtn = this.element.querySelector('[data-start-game-btn]')
	}

	setup(tournament, onStartTournament) {
		this.#tournament = tournament

		this.#addInitialPlayer()

		this.#elements.form.addEventListener('submit', this.#handleAddPlayer.bind(this))
		this.#elements.startGameBtn.addEventListener('click', this.#handleStartTournament.bind(this, onStartTournament))
	}

	show() {
		this.element.classList.remove('hidden')
		this.#elements.input.focus()
	}

	hide() {
		this.element.classList.add('hidden')
	}

	#addInitialPlayer() {
		const username = authService.user.username
		this.#tournament.addPlayer(username)
		this.#elements.playerList.appendChild(this.#renderPlayer(username))
	}

	#handleAddPlayer(e) {
		e.preventDefault()

		const formData = new FormData(e.target)
		const name = formData.get('player-name').trim()
		if (!name)
			return

		try {
			this.#tournament.addPlayer(name)
			this.#elements.playerList.appendChild(this.#renderPlayer(name))
			e.target.reset()
		} catch (err) {
			tempAlert.error(err.message)
		}
	}

	#handleStartTournament(onStartTournament) {
		try {
			this.#tournament.start()
			onStartTournament()
		} catch (err) {
			tempAlert.error(err.message)
		}
	}

	#renderPlayer(name) {
		const el = document.getElementById('tournament-player-template').content.firstElementChild.cloneNode(true)
		el.querySelector('[data-player-name]').textContent = name
		el.querySelector('button[data-remove-btn]').addEventListener('click', () => {
			this.#tournament.removePlayer(name)
			el.remove()
			this.#elements.input.focus()
		})
		return el
	}
}

class MatchListComponent {
	element

	#elements = {}

	constructor(element) {
		this.element = element

	}

	setup(onStartMatch) {
		this.#elements.list = this.element.querySelector('[data-list]')
		this.#elements.actionBtn = this.element.querySelector('[data-action-btn]')

		this.#elements.actionBtn.addEventListener('click', () => onStartMatch())
	}

	show(tournament) {
		const level = Number(Object.keys(tournament.pairings).sort().reverse()[0])
		for (let l = level; l > 0; l--) {
			const categoryName = (l === 1) ? 'Final' : `1/${Math.pow(2, l - 1)} Final`
			this.#elements.list.appendChild(this.#renderMatchCategory(categoryName))
			tournament.pairings[l].forEach(pairing =>
				this.#elements.list.appendChild(this.#renderMatch(pairing))
			)
		}

		this.element.classList.remove('hidden')
	}

	hide() {
		this.#elements.list.innerHTML = ''

		this.element.classList.add('hidden')
	}

	#renderMatchCategory(categoryName) {
		const el = document.getElementById('tournament-match-category-template').content.firstElementChild.cloneNode(true)
		el.textContent = categoryName
		return el
	}

	#renderMatch(pairing) {
		const el = document.getElementById('tournament-match-template').content.firstElementChild.cloneNode(true)
		el.querySelector('[data-player1]').textContent = pairing.player1 || '???'
		el.querySelector('[data-score-player1]').textContent = pairing.scorePlayer1 === null ? '' : `${pairing.scorePlayer1}`
		el.querySelector('[data-player2]').textContent = pairing.player2 || '???'
		el.querySelector('[data-score-player2]').textContent = pairing.scorePlayer2 === null ? '' : `${pairing.scorePlayer2}`
		return el
	}
}

class TournamentResultComponent {
	#buttonHandler

	element

	constructor(element) {
		this.element = element
	}

	show(winner, onFinish) {
		const textEl = this.element.querySelector('[data-text]')
		const actionButtonEl = this.element.querySelector('[data-action-btn]')

		textEl.textContent = `The winner is ${winner}`

		this.#buttonHandler = () => {
			onFinish(winner)
			this.hide()
		}
		actionButtonEl.addEventListener('click', this.#buttonHandler)

		this.element.classList.remove('hidden')
	}

	hide() {
		this.element.classList.add('hidden')

		const actionButtonEl = this.element.querySelector('[data-action-btn]')
		actionButtonEl.removeEventListener('click', this.#buttonHandler)
	}
}