def serialize_user(user):
	avatar = getattr(user, 'avatar', None)
	return {
		'id': user.id,
		'username': user.username,
		'email': user.email,
		'first_name': user.first_name,
		'last_name': user.last_name,
		'avatar': avatar.url if avatar else None,
		'is_connected': user.connection_counter > 0,
	}

def serialize_user_with_relation(user):
	data = serialize_user(user)
	if user.is_blocked:
		data['relationship'] = 'blocked'
	elif user.is_friend:
		data['relationship'] = 'friend'
	elif user.is_friend_request_sent:
		data['relationship'] = 'friend_request_sent'
	elif user.is_friend_request_received:
		data['relationship'] = 'friend_request_received'
	else:
		data['relationship'] = None
	return data