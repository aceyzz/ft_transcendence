#!/bin/bash
export VAULT_ADDR='http://localhost:8200'

# Start Vault server
vault server -config=/vault/config/config.hcl &

# Wait for Vault to start
echo "Waiting for Vault to start..."
sleep 2

# Check if Vault is initialized
IS_INITIALIZED=$(curl -s http://localhost:8200/v1/sys/health | jq -r '.initialized')

if [ "$IS_INITIALIZED" == "false" ]; then
	echo "Initializing Vault..."
	vault operator init -key-shares=1 -key-threshold=1 > /vault/init_output.txt

	if [ $? -ne 0 ]; then
		echo "Error initializing Vault"
		exit 1
	fi

	echo "Vault initialized."
else
	echo "Vault already initialized."
fi

# Get unseal key and token
VAULT_UNSEAL_KEY=$(grep 'Unseal Key 1:' /vault/init_output.txt | awk '{print $NF}')
VAULT_TOKEN=$(grep 'Initial Root Token:' /vault/init_output.txt | awk '{print $NF}')

# Check if Vault is sealed
SEALED=$(curl -s http://localhost:8200/v1/sys/health | jq -r '.sealed')

if [ "$SEALED" == "true" ]; then
	echo "Unsealing Vault..."
	vault operator unseal $VAULT_UNSEAL_KEY

	if [ $? -ne 0 ]; then
		echo "Error unsealing Vault"
		exit 1
	fi
	echo "Vault unsealed."
else
	echo "Vault already unsealed."
fi

# Export token
export VAULT_TOKEN

# Apply policy
echo "Applying policy 'django-policy'..."
vault policy write django-policy /vault/config/django-policy.hcl

if [ $? -ne 0 ]; then
	echo "Error applying policy 'django-policy'"
	exit 1
fi
echo "Policy 'django-policy' applied."

# Enable KV secrets
vault secrets enable -path=secret kv-v2

# Create token for Django
echo "Creating token for Django..."
DJANGO_TOKEN=$(vault token create -policy="django-policy" -format=json | jq -r '.auth.client_token')

# Store environment variables
echo "Storing environment variables..."
vault kv put secret/project-env \
	POSTGRES_DB="${POSTGRES_DB}" \
	POSTGRES_USER="${POSTGRES_USER}" \
	POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
	POSTGRES_HOSTNAME="${POSTGRES_HOSTNAME}" \
	POSTGRES_HOST="${POSTGRES_HOST}" \
	POSTGRES_PORT="${POSTGRES_PORT}" \
	REDIS_HOST="${REDIS_HOST}" \
	REDIS_PORT="${REDIS_PORT}" \
	HOST_NAME="${HOST_NAME}" \
	SECRET_KEY="${SECRET_KEY}" \
	DEBUG="${DEBUG}"


if [ $? -eq 0 ]; then
	echo "Environment variables stored."
else
	echo "Error storing environment variables."
fi

# Export token for Django
echo "Exporting Vault details..."
VAULT_SECRETS_FILE="/vault/secrets/.vault_env"
echo "VAULT_TOKEN=${DJANGO_TOKEN}" > "$VAULT_SECRETS_FILE"
echo "VAULT_ADDR=http://vault:8200" >> "$VAULT_SECRETS_FILE"
echo "Vault details exported."

echo "Vault is ready."
tail -f /dev/null