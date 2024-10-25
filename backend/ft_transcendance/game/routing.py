from django.urls import path
from game.consumers.LocalPongGameConsumer import LocalPongGameConsumer
from game.consumers.RemotePongGameConsumer import RemotePongGameConsumer

# Routes WebSocket App 
websocket_urlpatterns = [
    path('ws/game/local/', LocalPongGameConsumer.as_asgi()),
    path('ws/game/remote/', RemotePongGameConsumer.as_asgi()),
]
