import asyncio
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from myauth.serializers import serialize_user
from game.game import TimerGame
from game.models import Match

User = get_user_model()

class RemotePongGameConsumer(AsyncJsonWebsocketConsumer):
	match_status = Match.Status.PENDING
	game_group = None
	game_loop = None
	match = None
	game = None
	player1 = None
	player2 = None
	player1_score = 0
	player2_score = 0

	async def connect(self):
		self.user = self.scope['user']

		if not self.user.is_authenticated:
			await self.close()
			return

		await self.accept()

	async def disconnect(self, close_code):
		if self.game_loop:
			self.game_loop.cancel()
			self.game_loop = None

		if self.match_status != Match.Status.STARTED:
			if self.game_group:
				await self.channel_layer.group_discard(self.game_group, self.channel_name)
			if (
				self.match_status == Match.Status.PENDING
				and self.match
				and self.player1
				and self.player1.id == self.user.id
			):
				await self.match.adelete()
			return

		# Update match in the database
		opponent = self.player1 if self.player2.id == self.user.id else self.player2
		await Match.objects.filter(id=self.match.id).aupdate(
			status=Match.Status.FINISHED,
			player1_score=self.player1_score,
			player2_score=self.player2_score,
			winner=opponent,
			forfeited=True,
		)

		# Group send finished message
		winner_serialized = await sync_to_async(serialize_user)(opponent)
		await self.group_send_game_finished(
			'forfeit',
			winner_serialized,
			self.player1_score,
			self.player2_score
		)

		await self.channel_layer.group_discard(self.game_group, self.channel_name)

	async def receive_json(self, content):
		type = content.get('type')

		if type == 'game.join_as_host':
			await self.handle_join_as_host(content)
		elif type == 'game.join_as_guest':
			await self.handle_join_as_guest(content)
		elif type == 'game.player_action':
			await self.handle_player_action(content)

	async def group_game_joined(self, event):
		if event['user_id'] != self.user.id:
			await self.group_send_ready()

	async def group_game_ready(self, event):
		await self.send_start()
		self.match_status = Match.Status.STARTED
		if self.game:
			await Match.objects.filter(id=self.match.id).aupdate(status=Match.Status.STARTED)
			await asyncio.sleep(5)
			self.game_loop = asyncio.create_task(self.start_game())

	async def group_game_player_action(self, event):
		if self.game:
			self.game.player_action(event['player_id'], event['action'])

	async def group_game_state(self, event):
		self.player1_score = event['game_state']['player1']['score']
		self.player2_score = event['game_state']['player2']['score']
		await self.send_state(event['game_state'])

	async def group_game_finished(self, event):
		self.match_status = Match.Status.FINISHED
		await self.send_finished(
			event['reason'],
			event['winner'],
			event['player1_score'],
			event['player2_score']
		)

		if self.game_loop:
			self.game_loop.cancel()
			self.game_loop = None
		
		self.close()
	
	async def group_game_canceled(self, event):
		self.match_status = Match.Status.CANCELED
		await self.match.adelete()
		await self.send_canceled(event['reason'])
		self.close()

	async def handle_join_as_host(self, content):
		# Get game uuid
		game_uuid = content.get('game_uuid', None)
		if not game_uuid:
			await self.send_error('The game uuid is required.')
			return
		
		# Get match
		self.match = await Match.objects.select_related('player1', 'player2').filter(uuid=game_uuid, player1=self.user).afirst()
		if not self.match:
			await self.send_error('No match can be found with this uuid.')
			return
		
		# Set players and game
		self.player1 = self.match.player1
		self.player2 = self.match.player2
		self.game = TimerGame(600, 480, self.player1.id, self.player2.id, 60, True)

		# Join game group
		self.game_group = f'match_{self.match.uuid}'
		await self.channel_layer.group_add(self.game_group, self.channel_name)

		# Group send joined
		await self.group_send_joined(self.user.id)

	async def handle_join_as_guest(self, content):
		# Get game uuid
		game_uuid = content.get('game_uuid', None)
		if not game_uuid:
			await self.send_error('The game uuid is required.')
			return

		# Get match
		self.match = await Match.objects.select_related('player1', 'player2').filter(uuid=game_uuid, player2=self.user, status=Match.Status.PENDING).afirst()
		if not self.match:
			await self.send_canceled('The match was canceled.')
			return

		# Set players
		self.player1 = self.match.player1
		self.player2 = self.match.player2

		# Add to game group
		self.game_group = f'match_{game_uuid}'
		await self.channel_layer.group_add(self.game_group, self.channel_name)

		# Group send joined
		await self.group_send_joined(self.user.id)

	async def handle_player_action(self, content):
		action = content.get('action')
		if not action:
			return

		if self.game:
			self.game.player_action(self.user.id, action)
		else:
			await self.group_send_player_action(self.user.id, action)

	async def start_game(self):
		self.game.start()
		self.match_status = Match.Status.STARTED
		
		while not self.game.is_game_finished():
			self.game.update()
			await self.group_send_state(self.game.get_state())
			await asyncio.sleep(1 / 60)

		# Update match in database
		if self.game.get_winner() == 'player1':
			winner = self.player1
		elif self.game.get_winner() == 'player2':
			winner = self.player2
		else:
			winner = None
		await Match.objects.filter(id=self.match.id).aupdate(
			status=Match.Status.FINISHED,
			player1_score=self.game.player1_score,
			player2_score=self.game.player2_score,
			winner=winner
		)

		# Group send game finished
		if winner:
			winner_serialized = await sync_to_async(serialize_user)(winner)
		else:
			winner_serialized = None
		await self.group_send_game_finished(
			'timer',
			winner_serialized,
			self.game.player1_score,
			self.game.player2_score,
		)

	async def send_start(self):
		await self.send_json({
			'type': 'game.start',
			'delay': 5,
		})

	async def send_state(self, state):
		await self.send_json({
			'type': 'game.state',
			'game_state': state,
		})
	
	async def send_finished(self, reason, winner, player1_score, player2_score):
		await self.send_json({
			'type': 'game.finished',
			'reason': reason,
			'winner': winner,
			'player1_score': player1_score,
			'player2_score': player2_score,
		})
	
	async def send_canceled(self, reason):
		await self.send_json({
			'type': 'game.canceled',
			'reason': reason,
		})

	async def send_error(self, message):
		await self.send_json({
			'type': 'game.error',
			'message': message,
		})

	async def group_send_joined(self, user_id):
		await self.channel_layer.group_send(
			self.game_group,
			{
				'type': 'group.game.joined',
				'user_id': user_id,
			}
		)
	
	async def group_send_ready(self):
		await self.channel_layer.group_send(
			self.game_group,
			{
				'type': 'group.game.ready',
			}
		)
	
	async def group_send_state(self, state):
		await self.channel_layer.group_send(
			self.game_group,
			{
				'type': 'group.game.state',
				'game_state': state,
			}
		)
	
	async def group_send_player_action(self, player_id, action):
		await self.channel_layer.group_send(
			self.game_group,
			{
				'type': 'group.game.player_action',
				'player_id': player_id,
				'action': action,
			}
		)
	
	async def group_send_game_finished(self, reason, winner, player1_score, player2_score):
		await self.channel_layer.group_send(
			self.game_group,
			{
				'type': 'group.game.finished',
				'reason': reason,
				'winner': winner,
				'player1_score': player1_score,
				'player2_score': player2_score,
			}
		)

	# A MODIFIER, MAIS FONCTIONNEL
	@database_sync_to_async
	def get_player1(self):
		return self.match.player1

	@database_sync_to_async
	def get_player2(self):
		return self.match.player2
	
	@database_sync_to_async
	def get_serialized_player(self, player):
		return serialize_user(player)