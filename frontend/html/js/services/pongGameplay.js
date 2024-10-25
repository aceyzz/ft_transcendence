import { routerService } from '../services/routerService.js'

let canvas, context;
const player1 = { x: 10, y: 150, width: 8, height: 80, dy: 0 };
const player2 = { x: 580, y: 150, width: 8, height: 80, dy: 0 };
const ball = { x: 300, y: 200, radius: 8, dx: 5, dy: 5 }; // Increased speed
const wallThickness = 5;
let player1Score = 0;
let player2Score = 0;
const maxScore = 5; // limite de score pour la win, a changer si besoin
let cooldownActive = false;
let animationFrameId;
let gameRunning = false;

const colors = {
	wall: 'rgba(255, 255, 255, 1)',
	ball: 'rgba(255, 255, 255, 1)',
	midline: 'rgba(255, 255, 255, 0.5)',
	field: 'rgba(26, 33, 48, 1)'
};

export function setupPongGame(pongCanvas) {
	canvas = pongCanvas;
	context = canvas.getContext('2d');
	canvas.width = 600;
	canvas.height = 400;

	document.addEventListener('keydown', keyDownHandler);
	document.addEventListener('keyup', keyUpHandler);

	const backButton = document.getElementById('back-to-menu');
	backButton.addEventListener('click', () => stopGame());

	drawGame();
}

function keyDownHandler(event) {
	switch (event.key) {
		case 'ArrowUp':
			player2.dy = -7;
			break;
		case 'ArrowDown':
			player2.dy = 7;
			break;
		case 'w':
			player1.dy = -7;
			break;
		case 's':
			player1.dy = 7;
			break;
	}
}

function keyUpHandler(event) {
	switch (event.key) {
		case 'ArrowUp':
		case 'ArrowDown':
			player2.dy = 0;
			break;
		case 'w':
		case 's':
			player1.dy = 0;
			break;
	}
}

function movePlayers() {
	// déplacement des pads
	player1.y += player1.dy;
	player2.y += player2.dy;

	// collision avec les murs pad1
	if (player1.y < wallThickness) player1.y = wallThickness;
	if (player1.y + player1.height > canvas.height - wallThickness)
		player1.y = canvas.height - player1.height - wallThickness;

	// collision avec les murs pad2
	if (player2.y < wallThickness) player2.y = wallThickness;
	if (player2.y + player2.height > canvas.height - wallThickness)
		player2.y = canvas.height - player2.height - wallThickness;
}

function moveBall() {
	// cooldown apres but
	if (cooldownActive) return;

	ball.x += ball.dx;
	ball.y += ball.dy;

	// rebond contre les murs
	if (ball.y - ball.radius < wallThickness) {
		ball.dy *= -1;
		ball.y = wallThickness + ball.radius;
	} else if (ball.y + ball.radius > canvas.height - wallThickness) {
		ball.dy *= -1;
		ball.y = canvas.height - wallThickness - ball.radius;
	}

	// rebond pad 1
	if (ball.x - ball.radius <= player1.x + player1.width && ball.x - ball.radius > player1.x && ball.y > player1.y && ball.y < player1.y + player1.height) {
		const relativeIntersectY = (player1.y + player1.height / 2) - ball.y;
		const normalizedRelativeIntersectionY = relativeIntersectY / (player1.height / 2);
		const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;

		// rebond vers la droite
		ball.dx = Math.abs(ball.dx);
		ball.dy = 7 * -Math.sin(bounceAngle); // Increased speed
	}

	// rebond pad 2
	if (ball.x + ball.radius >= player2.x && ball.x + ball.radius < player2.x + player2.width && ball.y > player2.y && ball.y < player2.y + player2.height) {
		const relativeIntersectY = (player2.y + player2.height / 2) - ball.y;
		const normalizedRelativeIntersectionY = relativeIntersectY / (player2.height / 2);
		const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;

		// rebond vers la gauche
		ball.dx = -Math.abs(ball.dx);
		ball.dy = 7 * -Math.sin(bounceAngle); // Increased speed
	}

	// la ya un goal ?
	if (ball.x + ball.radius < 0) {
		player2Score++;
		feedbackGoal();
	} else if (ball.x - ball.radius > canvas.width) {
		player1Score++;
		feedbackGoal();
	}

	checkGameEnd();
}

function checkGameEnd() {
	if (player1Score >= maxScore || player2Score >= maxScore) {
		gameRunning = false;
		endGame();
	}
}

function resetBall() {
	ball.x = canvas.width / 2;
	ball.y = canvas.height / 2;
	// redonner la balle au joueur qui a marqué, a changer ?
	ball.dx = ball.dx > 0 ? 5 : -5; // Increased speed
}

function drawGame() {
	// clean
	context.clearRect(0, 0, canvas.width, canvas.height);

	// terrain
	context.fillStyle = colors.field;
	context.fillRect(0, 0, canvas.width, canvas.height);

	// pads
	context.fillStyle = colors.wall;
	context.fillRect(player1.x, player1.y, player1.width, player1.height);
	context.fillRect(player2.x, player2.y, player2.width, player2.height);

	// murs
	context.fillRect(0, 0, canvas.width, wallThickness);
	context.fillRect(0, canvas.height - wallThickness, canvas.width, wallThickness);

	// midline
	context.strokeStyle = colors.midline;
	context.lineWidth = 3;
	context.beginPath();
	context.setLineDash([10, 5]);
	context.moveTo(canvas.width / 2, 0);
	context.lineTo(canvas.width / 2, canvas.height);
	context.stroke();
	context.setLineDash([]);

	// ball
	context.fillRect(0, 0, canvas.width, wallThickness);
	context.beginPath();
	context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
	context.fillStyle = colors.ball;
	context.fill();
	context.closePath();

	// scores (dans les divs)
	const player1ScoreElement = document.getElementById('player1-score');
	const player2ScoreElement = document.getElementById('player2-score');
	if (player1ScoreElement && player2ScoreElement) {
		player1ScoreElement.textContent = player1Score;
		player2ScoreElement.textContent = player2Score;
	}
}

export function startGame() {
	resetGameData();
	gameRunning = true;

	function gameLoop() {
		if (!gameRunning) return;

		movePlayers();
		moveBall();
		drawGame();
		if (gameRunning) {
			animationFrameId = requestAnimationFrame(gameLoop);
		}
	}

	animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
	let winnerMessage = 'Draw !';

	if (player1Score > player2Score) {
		winnerMessage = 'Player1 Wins !';
	} else if (player2Score > player1Score) {
		winnerMessage = 'Player2 Wins !';
	}

	const gameEndOverlay = document.getElementById("game-end-overlay");
	const gameEndMessage = document.getElementById("game-end-message");
	const gameScore = document.getElementById("game-score");
	const gameWinner = document.getElementById("game-winner");

	if (gameEndOverlay && gameEndMessage && gameScore && gameWinner) {
		gameEndMessage.textContent = 'GAME OVER';
		gameScore.textContent = `${player1Score} - ${player2Score}`;
		gameWinner.textContent = winnerMessage;
		gameEndOverlay.classList.add("active");
	}
}

export function resetGameData() {
	player1Score = 0;
	player2Score = 0;
	resetBall();
	cancelAnimationFrame(animationFrameId);
}

export function stopGame() {
	gameRunning = false;
	cancelAnimationFrame(animationFrameId);
	routerService.navigate("/game");
}

function feedbackGoal() {
	const flashOverlay = document.getElementById("flash-overlay");
	if (!flashOverlay) return;
	flashOverlay.classList.add('active');
	setTimeout(() => {
		flashOverlay.classList.remove('active');
	}, 200);

	cooldownActive = true;
	setTimeout(() => {
		cooldownActive = false;
		resetBall();
	}, 500);
}