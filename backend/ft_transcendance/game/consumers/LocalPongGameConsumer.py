import asyncio
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from game.game import TimerGame

class LocalPongGameConsumer(AsyncJsonWebsocketConsumer):
	game = None
	loop = None

	async def connect(self):
		self.user = self.scope['user']
		await self.accept()

	async def disconnect(self, close_code):
		if self.loop:
			self.loop.cancel()

	async def receive_json(self, content):
		type = content.get('type')

		if type == 'game.create':
			allow_draw = content.get('allow_draw', True)
			self.game = TimerGame(600, 480, 1, 2, 60, allow_draw)
			await self.send_json({
				'type': 'game.start',
				'delay': 5,
				'width': 600,
				'height': 480
			})
			await asyncio.sleep(5)
			self.loop = asyncio.create_task(self.game_start())

		elif type == 'game.player_action':
			action = content.get('action')
			player = content.get('player')
			self.game.player_action(player, action)
		
		else:
			print('Unknown message type')

	async def game_start(self):
		self.game.start()
		while not self.game.is_game_finished():
			self.game.update()
			game_state = self.game.get_state()
			await self.send_json({
				'type': 'game.state',
				'game_state': game_state
			})
			await asyncio.sleep(1 / 70)

		winner = self.game.get_winner()
		await self.send_json({
			'type': 'game.finished',
			'winner': winner,
			'player1_score': self.game.player1_score,
			'player2_score': self.game.player2_score
		})
