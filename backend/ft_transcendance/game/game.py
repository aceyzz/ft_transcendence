import random
import unittest
import math

from datetime import datetime, timedelta

class Player:
	user_id = None
	x = 0
	y = 0
	dy = 0
	speed = 8
	width = 8
	height = 80

	def __init__(self, canvas_height, x, user_id):
		self.user_id = user_id
		self.y = canvas_height / 2
		self.x = x
		self.paddle_height = 80
		self.paddle_width = 8
		self.canvas_height = canvas_height

	def update(self):
		new_y = self.y + self.dy
		if 0 <= new_y - self.paddle_height / 2 and new_y + self.paddle_height / 2 <= self.canvas_height:
			self.y = new_y
		else:
			if new_y - self.paddle_height / 2 < 0:
				self.y = self.paddle_height / 2
			elif new_y + self.paddle_height / 2 > self.canvas_height:
				self.y = self.canvas_height - self.paddle_height / 2

	def action(self, action):
		if action == 'up_start':
			self.dy = -self.speed
		if action == 'down_start':
			self.dy = self.speed
		if action == 'up_stop' or action == 'down_stop':
			self.dy = 0

	def touches_ball(self, ball):
		if self.x < ball.canvas_width / 2:
			if self.x <= ball.x + ball.radius and ball.x - ball.radius <= self.x + self.paddle_width:
				if self.y - self.paddle_height / 2 <= ball.y <= self.y + self.paddle_height / 2:
					return True
		else:
			if self.x - self.paddle_width <= ball.x + ball.radius and ball.x - ball.radius <= self.x:
				if self.y - self.paddle_height / 2 <= ball.y <= self.y + self.paddle_height / 2:
					return True
		return False

	def adjust_ball(self, ball):
		max_bounce_angle = 5 * math.pi / 12

		if self.touches_ball(ball):
			ball.touch_count += 1
			if ball.speed < ball.MAX_SPEED and ball.touch_count % 2 == 0:
				ball.speed += 2.0
				ball.speed = min(ball.speed, ball.MAX_SPEED)

			relativ_intersect_Y = self.y - ball.y
			normalize_relativ_intersect_Y = relativ_intersect_Y / (self.paddle_height / 2)
			bounce_angle = normalize_relativ_intersect_Y * max_bounce_angle

			if self.x < ball.canvas_width / 2:
				ball.dx = abs(ball.speed * math.cos(bounce_angle))
			else:
				ball.dx = -abs(ball.speed * math.cos(bounce_angle))

			ball.dy = ball.speed * -math.sin(bounce_angle)

class Ball:
	BASE_SPEED = 5
	MAX_SPEED = 12
	speed = 5
	touch_count = 0

	def __init__(self, canvas_width, canvas_height):
		self.canvas_width = canvas_width
		self.canvas_height = canvas_height
		self.radius = 8
		self.reset()
	
	def update(self):
		self.x += self.dx
		self.y += self.dy
		self.check_wall_collision()
	
	def reset(self):
		self.speed = self.BASE_SPEED
		self.touch_count = 0

		max_bounce_angle = 5 * math.pi / 12
		angle = max_bounce_angle * random.random()

		self.x = self.canvas_width / 2
		self.y = self.canvas_height / 2

		self.dx = abs(self.speed * math.cos(angle))
		if random.random() > 0.5:
			self.dx = -self.dx
		self.dy = self.speed * math.sin(angle)
		if random.random() > 0.5:
			self.dy = -self.dy

	def check_wall_collision(self):
		if self.y - self.radius <= 0:
			self.dy = -self.dy
			self.y = self.radius
		elif self.y + self.radius >= self.canvas_height:
			self.dy = -self.dy
			self.y = self.canvas_height - self.radius
		if self.x - self.radius <= 0:
			self.dx = -self.dx
			self.x = self.radius
		elif self.x + self.radius >= self.canvas_width:
			self.dx = -self.dx
			self.x = self.canvas_width - self.radius

class Game:
	canvas_width = 0
	canvas_height = 0
	start_time = 0
	player1 = None
	player2 = None
	player1_score = 0
	player2_score = 0
	ball = None
	allow_draw = True

	def __init__(self, canvas_width, canvas_height, player1_id, player2_id, allow_draw):
		self.canvas_width = canvas_width
		self.canvas_height = canvas_height
		self.player1 = Player(self.canvas_height, 10, player1_id)
		self.player2 = Player(self.canvas_height, self.canvas_width - 10, player2_id)
		self.allow_draw = allow_draw
	
	def start(self):
		self.start_time = datetime.now()
		self.ball = Ball(self.canvas_width, self.canvas_height)

	def update(self):
		self.ball.update()
		self.player1.update()
		self.player2.update()

		if self.player1.touches_ball(self.ball):
			self.player1.adjust_ball(self.ball)
		elif self.player2.touches_ball(self.ball):
			self.player2.adjust_ball(self.ball)

		if self.player2_scored():
			self.player1_score += 1
			self.reset()
		elif self.player1_scored():
			self.player2_score += 1
			self.reset()

	def reset(self):
		self.ball.reset()
	
	def player_action(self, user_id, action):
		if self.player1.user_id == user_id:
			self.player1.action(action)
		elif self.player2.user_id == user_id:
			self.player2.action(action)
	
	def player1_scored(self):
		return self.ball.x - self.ball.radius <= 0

	def player2_scored(self):
		return self.ball.x + self.ball.radius >= self.canvas_width

	def is_game_finished(self):
		pass

	def get_state(self):
		seconds_left = self.duration_seconds - (datetime.now() - self.start_time).seconds
		return {
			'ball': {
				'x': self.ball.x,
				'y': self.ball.y,
			},
			'player1': {
				'x': self.player1.x,
				'y': self.player1.y,
				'score': self.player1_score,
			},
			'player2': {
				'x': self.player2.x,
				'y': self.player2.y,
				'score': self.player2_score,
			},
			'seconds_left': seconds_left,
		}
	
	def get_winner(self):
		if self.player1_score > self.player2_score:
			return 'player1'
		elif self.player2_score > self.player1_score:
			return 'player2'
		else:
			return 'draw'

class TimerGame(Game):
	duration_seconds = 0
	start_time = None

	def __init__(self, canvas_width, canvas_height, player1_id, player2_id, duration_seconds, allow_draw):
		super().__init__(canvas_width, canvas_height, player1_id, player2_id, allow_draw)
		self.duration_seconds = duration_seconds
		self.start_time = datetime.now()
	
	def is_game_finished(self):
		time_is_up = (self.start_time + timedelta(seconds=self.duration_seconds)) <= datetime.now()
		is_draw = self.player1_score == self.player2_score
		if self.allow_draw:
			return time_is_up
		return time_is_up and not is_draw

class MaxScoreGame(Game):
	max_score = 0

	def __init__(self, canvas_width, canvas_height, player1_id, player2_id, max_score):
		super().__init__(canvas_width, canvas_height, player1_id, player2_id, False)
		self.max_score = max_score

	def is_game_finished(self):
		return self.player1_score >= self.max_score or self.player2_score >= self.max_score