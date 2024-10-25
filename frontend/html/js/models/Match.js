import { User } from './User.js'
export class Match {
	constructor(data = {}) {
		this.id = data.id
		this.uuid = data.uuid
		this.status = data.status
		this.player1 = new User(data.player1)
		this.player2 = new User(data.player2)
		this.scorePlayer1 = data.score_player1
		this.scorePlayer2 = data.score_player2
		this.timestamp = new Date(data.timestamp)
		this.winnerId = data.winner_id
		this.matchType = data.tournament ? 'tournament' : 'friendly'
	}

	resultFor(userId) {
		if (this.winnerId === null)
			return 'Draw'
		if (this.winnerId === userId)
			return 'Win'
		return 'Loss'
	}

	opponentFor(userId) {
		if (this.player1.id === userId)
			return this.player2
		if (this.player2.id === userId)
			return this.player1
		return null
	}
}