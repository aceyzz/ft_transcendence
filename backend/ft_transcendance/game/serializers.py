def serialize_match(match, user_serializer=None):
	return {
		'id': match.id,
		'player1': user_serializer(match.player1) if user_serializer else match.player1,
		'player2': user_serializer(match.player2) if user_serializer else match.player2,
		'score_player1': match.player1_score,
		'score_player2': match.player2_score,
		'winner_id': match.winner.id if match.winner else None,
		'tournament': match.tournament.id if match.tournament else None,
		'timestamp': match.created.isoformat(),
		'status': match.get_status_display(),  # Use de get_status_display() pour obtenir le label
	}
