"""
ASGI config for ft_transcendance project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ft_transcendance.settings')
asgi_application = get_asgi_application()
import game.routing 
import app.routing


application = ProtocolTypeRouter({
    "http": asgi_application,  # Gère les requêtes HTTP normales
    "websocket": AuthMiddlewareStack(
        URLRouter(
            app.routing.websocket_urlpatterns + game.routing.websocket_urlpatterns
            )
    ),
})
