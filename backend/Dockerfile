FROM python:3.12

RUN apt-get update && apt-get install -y curl jq

RUN curl -o /usr/local/bin/wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

COPY check-vault.sh /code/check-vault.sh
RUN chmod +x /code/check-vault.sh

RUN echo 'sleep 5' >> /code/check-vault.sh

WORKDIR /code

RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install -r requirements.txt

WORKDIR /code/ft_transcendance