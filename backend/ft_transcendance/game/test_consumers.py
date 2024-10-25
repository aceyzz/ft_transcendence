import pytest
from channels.testing import WebsocketCommunicator
from .consumers import PongGameConsumer

@pytest.mark.asyncio
async def test_can_connect():


    communicator = WebsocketCommunicator(PongGameConsumer.as_asgi(), "/ws/game/")
        
    # Vérifier si la connexion est acceptée
    connected, _ = await communicator.connect()
    assert connected

    # Déconnexion propre
    await communicator.disconnect()

@pytest.mark.asyncio
async def test_create_game():
    # Simuler une connexion WebSocket
    communicator = WebsocketCommunicator(PongGameConsumer.as_asgi(), "/ws/game/")
    
    # Connexion
    await communicator.connect()

    # Envoyer une commande 'create_game'
    await communicator.send_json_to({
        'type': 'create_game',
        'opponent_id': '1234'
    })

    response = await communicator.receive_json_from()
    assert response['type'] == 'game.match_request'
    assert response['mode'] == 'timeline'
    assert 'game_uuid' in response

    await communicator.disconnect()

@pytest.mark.asyncio
async def test_join_game():
    communicator = WebsocketCommunicator(PongGameConsumer.as_asgi(), "/ws/game/")
    
    await communicator.connect()

    await communicator.send_json_to({
        'type': 'join_game'
    })

    response = await communicator.receive_json_from()
    assert response['type'] == 'game.start'
    assert response['message'] == 'Le match commence !'

    await communicator.disconnect()
