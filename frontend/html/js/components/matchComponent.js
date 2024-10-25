import { emptyComponent } from '../modules/components.js';

const matchImages = {
	'Win': "/static/assets/win.png",
	'Loss': "/static/assets/loss.png",
	'Draw': "/static/assets/draw.png",
}

export class MatchListComponent {
	element

	constructor(element = null) {
		this.element = element
	}

	setup(matches, user) {
		this.element.innerHTML = ''

		// TODO: Use CSS after
		if (matches.length === 0) {
			this.element.innerHTML = emptyComponent('No recent matches found...');
			return;
		}

		const template = document.getElementById('match-template').content.firstElementChild;
		matches.reverse().forEach(match => {
			const matchComponent = new MatchComponent(template.cloneNode(true));
			matchComponent.setup(match, user);
			this.element.appendChild(matchComponent.element);
		});
	}
}

class MatchComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(match, user) {
		// Elements
		const imgEl = this.element.querySelector('[data-result-img')
		const opponentEl = this.element.querySelector('[data-opponent]')
		const score1El = this.element.querySelector('[data-score1]')
		const score2El = this.element.querySelector('[data-score2]')
		const timestampEl = this.element.querySelector('[data-timestamp]')

		// Display
		const result = match.resultFor(user.id)
		imgEl.src = matchImages[result]
		imgEl.alt = result
		opponentEl.textContent = `@${match.opponentFor(user.id)?.username || 'Unknown'}`
		score1El.textContent = match.scorePlayer1
		score2El.textContent = match.scorePlayer2
		timestampEl.textContent = new Date(match.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' -');
	}
}
