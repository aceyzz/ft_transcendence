export class GameResult {
	constructor(data) {
		this.player1 = data.player1
		this.player2 = data.player2
		this.player1Score = data.player1Score
		this.player2Score = data.player2Score
		this.winner = data.winner
	}
}