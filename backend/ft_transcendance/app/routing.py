from django.urls import path
from . import consumers

# Routes WebSocket App 
websocket_urlpatterns = [
    path('ws/app/', consumers.AppConsumer.as_asgi()),
]
