import { authService } from '../services/authService.js'
import { authRequirements } from '../utils/authRequirements.js'
import { statsService } from '../services/statsService.js'
import { emptyComponent } from '../modules/components.js'

export class StatsRoute {
	authentication = authRequirements.loginRequired
	partial = 'partials/stats.html'

	async setup(container) {
		// Load data
		const user = authService.user
		const stats = await statsService.getUserStats(user.id)
		const matches = await statsService.listMatches(user.id)
		
		// Deduce additionnal data
		const additionnalStats = this.#calculateAverageScore(matches.data, user.id)
		stats.averageScore = additionnalStats.averageScore
		stats.totalMatches = additionnalStats.totalMatches
		stats.totalDraws = additionnalStats.totalDraws

		// Create components
		const statsRecapComponent = new StatsRecapComponent(container.querySelector(':scope #stats-recap'))
		const matchListComponent = new MatchListComponent(container.querySelector(':scope #match-list'))

		// Setup components
		matchListComponent.setup(matches.data, user)
		statsRecapComponent.setup(stats)
	}

	#calculateAverageScore(matches, userId) {
		let totalScore = 0
		let totalMatches = 0
		let draws = 0
		matches.forEach(match => {
			const playerScore = match.player1.id === userId ? match.scorePlayer1 : match.scorePlayer2
			totalMatches++
			totalScore += playerScore
			if (match.scorePlayer1 === match.scorePlayer2)
				draws++
		})

		return {
			totalMatches: totalMatches,
			averageScore: totalMatches ? (totalScore / totalMatches) : 0,
			totalDraws: draws
		}
	}
}

class MatchListComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(matches, user) {
		this.element.innerHTML = ''

		if (!matches.length) {
			this.element.innerHTML = emptyComponent('No match history')
			return
		}

		const templateEl = document.getElementById('match-template').content.firstElementChild
		matches.forEach(match => {
			const matchComponent = new MatchComponent(templateEl.cloneNode(true))
			matchComponent.setup(match, user)
			this.element.appendChild(matchComponent.element)
		})
	}
}

class MatchComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(match, user) {
		// Data
		const result = match.resultFor(user.id)

		// Elements
		const dateEl = this.element.querySelector('[data-date]')
		const typeEl = this.element.querySelector('[data-type]')
		const opponentEl = this.element.querySelector('[data-opponent]')
		const score1El = this.element.querySelector('[data-score1]')
		const score2El = this.element.querySelector('[data-score2]')
		const resultEl = this.element.querySelector('[data-result]')

		// Display
		this.element.classList.add(result.toLowerCase())
		dateEl.textContent = match.timestamp.toLocaleDateString()
		typeEl.textContent = match.matchType
		opponentEl.textContent = match.opponentFor(user.id)?.username || 'Unknown'
		score1El.textContent = match.scorePlayer1
		score2El.textContent = match.scorePlayer2
		resultEl.textContent = result
	}
}

class StatsRecapComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(stats) {
		// Calculate data
		const ratio = stats.losses === 0 ? stats.wins : (stats.wins / stats.losses)

		// Create and append new elements using template
		const templateEl = document.getElementById('stat-header-item').content.firstElementChild

		const createStatElement = (title, content, bgColor) => {
			const statElement = templateEl.cloneNode(true)
			statElement.querySelector('[data-stat-header-title]').textContent = title
			statElement.querySelector('[data-stat-header-logo]').src = `/static/assets/stats/${title.toLowerCase().replace(' ', '-')}.png`
			statElement.querySelector('[data-stat-header-logo]').alt = `${title.toLowerCase().replace(' ', '-')}`
			statElement.querySelector('[data-stat-header-content]').textContent = content
			if (bgColor)
				statElement.style.backgroundColor = bgColor

			return statElement
		}

		const statElements = {
			winsEl: createStatElement('Wins', stats.wins, 'var(--stat-win'),
			lossesEl: createStatElement('Losses', stats.losses, 'var(--stat-loss'),
			drawsEl: createStatElement('Draws', stats.totalDraws, 'var(--stat-draw'),
			ratioEl: createStatElement('Ratio', ratio.toFixed(2), 'var(--stat-info'),
			averageScoreEl: createStatElement('Average Score', stats.averageScore.toFixed(2), 'var(--stat-info'),
			totalMatchesEl: createStatElement('Total Matches', stats.totalMatches, 'var(--stat-info')
		}

		// parcourt tout les elements de l'objet statElements et les append
		for (const statEl of Object.values(statElements))
			this.element.appendChild(statEl)
	}
}
