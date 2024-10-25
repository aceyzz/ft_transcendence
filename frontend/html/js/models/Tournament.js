const tournamentStates = {
	notStarted: Symbol('notStarted'),
	started: Symbol('started'),
	finished: Symbol('finished'),
}

const placeholder = Symbol('placeholder')

export class Tournament {
	#maxPlayerCount
	#state = tournamentStates.notStarted
	#currentLevel = null

	players = []
	pairings = {}

	constructor(maxPlayerCount = 8) {
		if (maxPlayerCount < 3)
			throw new Error("The tournament must accept at least 3 players.")

		this.#maxPlayerCount = maxPlayerCount
	}

	get isFull() {
		return this.players.length === this.#maxPlayerCount
	}

	get isFinished() {
		return this.#state === tournamentStates.finished
	}

	get currentPairing() {
		if (this.#state !== tournamentStates.started)
			return null
		return this.pairings[this.#currentLevel].find(pairing => pairing.scorePlayer1 === null)
	}
	
	get winner() {
		if (this.#state !== tournamentStates.finished)
			return null
		return this.pairings[1][0].winner
	}

	addPlayer(playerName) {
		if (this.players.length === this.#maxPlayerCount)
			throw new Error(`The tournament has reached the maximum number of players (${this.#maxPlayerCount}).`)

		const name = playerName.trim()
		if (this.players.includes(name))
			throw new Error("Another player already has the same name.")

		this.players.push(name)
	}

	removePlayer(playerName) {
		const index = this.players.indexOf(playerName)
		if (index > -1)
			this.players.splice(index, 1)
	}

	start() {
		if (this.players.length < 3)
			throw new Error("There must be at least three players to start a tournament.")

		const log = Math.log2(this.players.length)
		const maxLevel = Math.ceil(log)

		// Fill all levels except max level with empty pairings
		for (let i = 1; i < maxLevel; i++) {
			const pairingCount = Math.pow(2, i - 1)
			this.pairings[i] = []
			for (let j = 0; j < pairingCount; j++)
				this.pairings[i].push(new Pairing())
		}
		// Add empty pairings for max level
		this.pairings[maxLevel] = []

		this.#state = tournamentStates.started
		this.#currentLevel = maxLevel

		if (maxLevel === log) {
			const maxLevelPlayers = this.players.slice(0)
			while (maxLevelPlayers.length) {
				const [player1, player2] = maxLevelPlayers.splice(0, 2)
				this.pairings[maxLevel].push(new Pairing(player1, player2))
			}
			return
		}

		const totalPlayerCount = this.players.length
		const prevLevel = maxLevel - 1
		const prevLevelMaxPlayerCount = Math.pow(2, prevLevel)
		const maxLevelActualPlayerCount = (totalPlayerCount - prevLevelMaxPlayerCount) * 2

		const maxLevelPlayers = this.players.slice(0, maxLevelActualPlayerCount)
		const prevLevelPlayers = this.players.slice(maxLevelActualPlayerCount)
		// Fill max level
		while (maxLevelPlayers.length) {
			const [player1, player2] = maxLevelPlayers.splice(0, 2)
			this.pairings[maxLevel].push(new Pairing(player1, player2))
		}
		// Fill previous level (before max)
		let pairingIndex = this.pairings[prevLevel].length - 1
		while (prevLevelPlayers.length) {
			const [player1, player2] = prevLevelPlayers.splice(-2, 2)
			if (player2) {
				this.pairings[prevLevel][pairingIndex].player1 = player1
				this.pairings[prevLevel][pairingIndex].player2 = player2
				pairingIndex--
			}
			else
				this.pairings[prevLevel][pairingIndex--].player2 = player1
		}

	}

	setScore(scorePlayer1, scorePlayer2) {
		const currentPairing = this.currentPairing
		if (!currentPairing)
			throw new Error("There are no more pairings to play")

		currentPairing.setScore(scorePlayer1, scorePlayer2)
		if (this.#currentLevel > 1) {
			const freePairing = this.pairings[this.#currentLevel - 1].find(pairing => pairing.player1 === null || pairing.player2 === null)
			if (freePairing.player1 === null)
				freePairing.player1 = currentPairing.winner
			else
				freePairing.player2 = currentPairing.winner
		}

		if (!this.currentPairing)
			this.#currentLevel--

		if (this.#currentLevel === 0)
			this.#state = tournamentStates.finished
	}
}

class Pairing {
	player1
	player2
	scorePlayer1 = null
	scorePlayer2 = null

	constructor(player1 = null, player2 = null) {
		this.player1 = player1
		this.player2 = player2
	}

	get winner() {
		if (this.scorePlayer1 > this.scorePlayer2)
			return this.player1
		if (this.scorePlayer1 < this.scorePlayer2)
			return this.player2
		return null
	}

	setPlayer(player) {
		if (this.player1 === null)
			this.player1 = player
		else if (this.player2 === null)
			this.player2 = player
		else
			throw new Error("The pairing already has two players.")

	}

	setScore(scorePlayer1, scorePlayer2) {
		this.scorePlayer1 = scorePlayer1
		this.scorePlayer2 = scorePlayer2
	}
}