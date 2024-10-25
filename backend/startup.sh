mkdir -p /code/logs
python /code/ft_transcendance/manage.py migrate \
	&& python /code/ft_transcendance/manage.py reset_connection_counters \
	&& daphne -b 0.0.0.0 -p 8000 ft_transcendance.asgi:application