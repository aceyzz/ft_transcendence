import { LocalGameWebSocketService } from '../services/LocalGameWebSocketService.js';
import { GameResult } from '../models/GameResult.js';

const colors = {
	primary: '#387478',		// Dark Cyan
	secondary: '#243642',	// Dark Grey
	white: '#E2F1E7',		// Light White
	black: '#0D0D0D',		// Almost Black
	background: '#243642',	// Dark Background
	paddle: '#387478',		// Darker variant of primary
	ball: '#E2F1E7'			// Light White ball
};

export class LocalGameComponent {
	#components = {}

	#allowDraw
	#player1
	#player2
	#serverCanvasWidth = 600;
	#serverCanvasHeight = 480;
	#gameService = null
	#countdownInterval
	#keyDownHandler;
	#keyUpHandler;

	element

	constructor(element, allowDraw = true) {
		this.element = element
		this.#allowDraw = allowDraw

		this.#keyDownHandler = this.#handleKeyEvent.bind(this, 'start');
		this.#keyUpHandler = this.#handleKeyEvent.bind(this, 'stop');
	}

	setup(onFinish) {
		this.#components.gameCards = new GameCardsComponent(this.element.querySelector('[data-game-cards]'))
		this.#components.canvas = new GameCanvasComponent(this.element.querySelector('#game-canvas'), this.#serverCanvasWidth, this.#serverCanvasHeight)
		this.#components.mobileControls = new MobileControlsComponent(this.element.querySelector('[data-mobile-controls]'))
		this.#components.gameResult = new GameResultComponent(this.element.querySelector('.game-result-popup'), onFinish)
		
		this.#components.mobileControls.setup((player, action) => this.#sendPlayerAction(player, action))
	}

	cleanup() {
		this.stop()

		Object.values(this.#components).forEach(component => component.cleanup?.())
	}

	show() {
		this.element.classList.remove('hidden')
	}

	hide() {
		this.element.classList.add('hidden')
	}

	start(player1, player2) {
		this.#player1 = player1
		this.#player2 = player2

		this.#components.gameCards.setPlayer1(player1)
		this.#components.gameCards.setPlayer2(player2)

		this.#components.canvas.init()
		this.#gameService = new LocalGameWebSocketService({
			start: this.#handleGameStart.bind(this),
			state: this.#handleGameUpdate.bind(this),
			finished: this.#handleGameFinished.bind(this),
		})
		this.#gameService.open()
		this.#gameService.sendCreateGame('timer', this.#allowDraw);

		window.addEventListener('keydown', this.#keyDownHandler);
		window.addEventListener('keyup', this.#keyUpHandler);
	}

	stop() {
		this.#gameService?.close()
		clearInterval(this.#countdownInterval)

		window.removeEventListener('keydown', this.#keyDownHandler)
		window.removeEventListener('keyup', this.#keyUpHandler)
	}

	#sendPlayerAction(player, action) {
		this.#gameService.sendPlayerAction(player, action)
	}

	#handleGameStart() {
		let countdown = 4; // TODO: Make it come from the backend
		this.#countdownInterval = setInterval(() => {
			this.#components.canvas.displayCountdown(countdown);
			countdown--;
			if (countdown < 0)
				clearInterval(this.#countdownInterval);
		}, 1000);
	}

	#handleGameUpdate(gameState) {
		this.#components.canvas.displayGameState(gameState)
		this.#components.gameCards.updateScorePlayer1(gameState.player1.score)
		this.#components.gameCards.updateScorePlayer2(gameState.player2.score)
	}

	#handleGameFinished(gameResult) {
		const winner = gameResult.winner === 'player1'
			? this.#player1
			: gameResult.winner === 'player2'
			? this.#player2
			: null
		const result = new GameResult({
			player1: this.#player1,
			player2: this.#player2,
			player1Score: gameResult.player1_score,
			player2Score: gameResult.player2_score,
			winner,
		})
		// const winnerUsername = gameResult.winner === 'player1' ? this.#player1.username : this.#player2.username;
		// const opponentUsername = gameResult.winner === 'player1' ? this.#player2.username : this.#player1.username;
		// const scoreWinner = gameResult.winner === 'player1' ? gameResult.player1_score : gameResult.player2_score;
		// const scoreOpponent = gameResult.winner === 'player1' ? gameResult.player2_score : gameResult.player1_score;

		const resultText = winner ? `🏆 Winner: ${winner.username}` : 'It\'s a draw!'
		this.#components.gameResult.show(result, resultText)

		this.stop();
	}

	#handleKeyEvent(type, e) {
		if (e.repeat)
			return;

		const keyMap = {
			'w': { action: 'up', player: 1 },
			's': { action: 'down', player: 1 },
			'ArrowUp': { action: 'up', player: 2 },
			'ArrowDown': { action: 'down', player: 2 }
		};

		if (document.activeElement.tagName === 'INPUT') return;

		const keyAction = keyMap[e.key];
		if (keyAction) {
			this.#sendPlayerAction(keyAction.player, `${keyAction.action}_${type}`);
		}
	}
}

class GameCardsComponent {
	element

	constructor(element) {
		this.element = element;
	}

	setPlayer1(player) {
		this.#setPlayer(0, player, 0)
	}

	setPlayer2(player) {
		this.#setPlayer(1, player, 0)
	}

	updateScorePlayer1(newScore) {
		this.#updateScore(0, newScore)
	}

	updateScorePlayer2(newScore) {
		this.#updateScore(1, newScore)
	}

	#setPlayer(index, player, initialScore = 0) {
		const defaultAvatar = '/static/assets/user_default.png'

		// Elements
		const cardEl = this.element.querySelectorAll('[data-player-card]').item(index)
		const usernameEl = cardEl.querySelector('[data-username]');
		const avatarEl = cardEl.querySelector('[data-avatar]');
		const scoreEl = cardEl.querySelector('[data-score]');

		// Display

		usernameEl.textContent = player.username;
		if (player.avatar)
			avatarEl.src = player.avatar;
		else
			avatarEl.src = defaultAvatar
		scoreEl.textContent = `${initialScore}`;
	}

	#updateScore(index, newScore) {
		const cardEl = this.element.querySelectorAll('[data-player-card]').item(index)
		const scoreEl = cardEl.querySelector('[data-score]')
		scoreEl.textContent = `${newScore}`
	}
}

class GameCanvasComponent {
	#ctx
	#resizeHandler
	#serverCanvasWidth
	#serverCanvasHeight

	element

	constructor(element, serverCanvasWidth, serverCanvasHeight) {
		this.element = element
		this.#ctx = this.element.getContext('2d')

		this.#serverCanvasWidth = serverCanvasWidth
		this.#serverCanvasHeight = serverCanvasHeight

		this.#resizeHandler = this.#resize.bind(this)
	}

	setup() {
		window.addEventListener('resize', this.#resizeHandler)
	}

	cleanup() {
		window.removeEventListener('resize', this.#resizeHandler)
	}

	init() {
		this.clear()
		this.#resize()
	}

	displayGameState(gameState) {
		if (!gameState) return;

		const remainingTime = Math.floor(gameState.seconds_left);

		this.clear();
		this.#drawBall(gameState.ball);
		this.#drawPaddle(gameState.player1, 'left');
		this.#drawPaddle(gameState.player2, 'right');
		this.#drawTimer(remainingTime);

	}

	displayCountdown(seconds) {
		this.clear();
		this.#ctx.fillStyle = colors.primary;
		this.#ctx.font = 'bold 50px Arial';
		this.#ctx.textAlign = 'center';
		this.#ctx.shadowColor = colors.primary;
		this.#ctx.shadowBlur = 10;
		this.#ctx.fillText(seconds, this.element.width / 2, this.element.height / 2);
		this.#ctx.shadowBlur = 0;
	}

	displayGameResult(resultText, player1, player1Score, player2, player2Score) {
		this.clear();
		this.#ctx.fillStyle = colors.primary;
		this.#ctx.font = 'bold 40px Arial';
		this.#ctx.textAlign = 'center';
		this.#ctx.shadowColor = colors.primary;
		this.#ctx.shadowBlur = 10;
		this.#ctx.fillText('GAME FINISHED', this.element.width / 2, this.element.height / 4);

		this.#ctx.font = 'bold 35px Arial';
		this.#ctx.fillStyle = colors.white;
		this.#ctx.fillText(resultText, this.element.width / 2, this.element.height / 2);

		this.#ctx.font = 'bold 25px Arial';
		this.#ctx.fillStyle = colors.primary;
		const player1ScoreText = `${player1}: ${player1Score}`;
		const player2ScoreText = `${player2}: ${player2Score}`;

		this.#ctx.fillText(player1ScoreText, this.element.width / 2, (this.element.height / 4) * 3 - 15);
		this.#ctx.fillText(player2ScoreText, this.element.width / 2, (this.element.height / 4) * 3 + 15);

		this.#ctx.shadowBlur = 0;
	}

	displayMessage(message = '') {
		this.clear();
		this.#ctx.fillStyle = colors.primary;
		this.#ctx.font = 'bold 30px Arial';
		this.#ctx.textAlign = 'center';
		this.#ctx.fillText(message, this.element.width / 2, this.element.height / 2);
	}

	clear() {
		this.#ctx.clearRect(0, 0, this.element.width, this.element.height);
		this.#ctx.fillStyle = colors.background;
		this.#ctx.fillRect(0, 0, this.element.width, this.element.height);
	}

	#resize() {
		this.element.width = this.element.parentNode.clientWidth;
		this.element.height = this.element.parentNode.clientHeight;

		const aspectRatio = this.#serverCanvasWidth / this.#serverCanvasHeight;
		if (this.element.width / this.element.height > aspectRatio) {
			this.element.width = this.element.height * aspectRatio;
		} else {
			this.element.height = this.element.width / aspectRatio;
		}
	}

	#drawBall(ball) {
		if (!ball) return;

		const ballX = (ball.x / this.#serverCanvasWidth) * this.element.width;
		const ballY = (ball.y / this.#serverCanvasHeight) * this.element.height;
		const ballRadius = (8 / this.#serverCanvasWidth) * this.element.width;

		this.#ctx.beginPath();
		this.#ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
		this.#ctx.fillStyle = colors.ball;
		this.#ctx.fill();
		this.#ctx.closePath();
	}

	#drawPaddle(player, position) {
		if (!player) return;

		const paddleY = (player.y / this.#serverCanvasHeight) * this.element.height;
		const paddleWidth = (8 / this.#serverCanvasWidth) * this.element.width;
		const paddleHeight = (80 / this.#serverCanvasHeight) * this.element.height;

		let paddleX;
		if (position === 'left')
			paddleX = (10 / this.#serverCanvasWidth) * this.element.width;
		else if (position === 'right')
			paddleX = (this.#serverCanvasWidth - 18) / this.#serverCanvasWidth * this.element.width;

		this.#ctx.fillStyle = colors.paddle;
		this.#ctx.fillRect(paddleX, paddleY - paddleHeight / 2, paddleWidth, paddleHeight);
	}

	#drawTimer(time) {
		if (time < 0)
			time = "Golden Goal";
		this.#ctx.fillStyle = colors.white;
		this.#ctx.font = '20px Arial';
		this.#ctx.textAlign = 'center';
		this.#ctx.fillText(`${time}`, this.element.width / 2, 30);
	}
}

class MobileControlsComponent {
	element

	constructor(element) {
		this.element = element
	}

	setup(onAction) {
		const upLeftEl = this.element.querySelector('[data-up-left]');
		const downLeftEl = this.element.querySelector('[data-down-left]');
		const upRightEl = this.element.querySelector('[data-up-right]');
		const downRightEl = this.element.querySelector('[data-down-right]');

		upLeftEl.addEventListener('touchstart', () => onAction(1, 'up_start'))
		upLeftEl.addEventListener('touchend', () => onAction(1, 'up_stop'))
		downLeftEl.addEventListener('touchstart', () => onAction(1, 'down_start'))
		downLeftEl.addEventListener('touchend', () => onAction(1, 'down_stop'))
		upRightEl.addEventListener('touchstart', () => onAction(2, 'up_start'))
		upRightEl.addEventListener('touchend', () => onAction(2, 'up_stop'))
		downRightEl.addEventListener('touchstart', () => onAction(2, 'down_start'))
		downRightEl.addEventListener('touchend', () => onAction(2, 'down_stop'))
	}
}

class GameResultComponent {
	#buttonHandler

	element
	onFinish
	

	constructor(element, onClose) {
		this.element = element
		this.onFinish = onClose
	}

	show(gameResult, resultText) {
		const resultTextEl = this.element.querySelector('.game-result-popup-content h2')

		const player1El = this.element.querySelector('.game-result-popup-player1')
		const player1AvatarEl = player1El.querySelector('.game-result-popup-player1-avatar')
		const player1UsernameEl = player1El.querySelector('.game-result-popup-player1-username')
		const player1ScoreEl = player1El.querySelector('.game-result-popup-player1-score')

		const player2El = this.element.querySelector('.game-result-popup-player2')
		const player2AvatarEl = player2El.querySelector('.game-result-popup-player2-avatar')
		const player2UsernameEl = player2El.querySelector('.game-result-popup-player2-username')
		const player2ScoreEl = player2El.querySelector('.game-result-popup-player2-score')

		const actionButtonEl = this.element.querySelector('#game-result-action')

		resultTextEl.textContent = resultText

		player1AvatarEl.src = gameResult.player1.avatar || '/static/assets/user_default.png'
		player1UsernameEl.textContent = gameResult.player1.username
		player1ScoreEl.textContent = gameResult.player1Score

		player2AvatarEl.src = gameResult.player2.avatar || '/static/assets/user_default.png'
		player2UsernameEl.textContent = gameResult.player2.username
		player2ScoreEl.textContent = gameResult.player2Score

		this.element.classList.remove('hidden')

		this.#buttonHandler = () => {
			this.hide()
			this.onFinish(gameResult)
		}

		actionButtonEl.addEventListener('click', this.#buttonHandler);
	}

	hide() {
		this.element.classList.add('hidden')

		const actionButtonEl = this.element.querySelector('#game-result-action')
		actionButtonEl.removeEventListener('click', this.#buttonHandler);
	}
}
