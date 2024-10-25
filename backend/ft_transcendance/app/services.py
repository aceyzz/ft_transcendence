from .db_utils import get_last_connection_by_username
from channels.layers import get_channel_layer

# Fonction pour envoyer une notification de demande d'ami
async def send_friend_request_notification(sender_username, target_username):
    connection = await get_last_connection_by_username(target_username)
    if connection:
        channel_layer = get_channel_layer()
        await channel_layer.send(connection.channel_name, {
            "type": "notification",
            "message": f"You receive a friend request from {sender_username}."
        })

async def send_match_request_notification(sender_username, target_username):
    connection = await get_last_connection_by_username(target_username)
    if connection:
        channel_layer = get_channel_layer()
        await channel_layer.send(connection.channel_name, {
            "type": "notification",
            "message": f"You receive a match request from {sender_username}."
        })
    else:
       send_error_message("match_request", "error")

async def send_tournament_request_notification(sender_username, target_username):
    connection = await get_last_connection_by_username(target_username)
    if connection:
        channel_layer = get_channel_layer()
        await channel_layer.send(connection.channel_name, {
            "type": "notification",
            "message": f"You receive a tournament request from {sender_username}."
        })
    else:
       send_error_message("tournament_request", "error")