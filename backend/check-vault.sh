#!/bin/bash

# Attendre que Vault soit prêt
echo "Checking Vault readiness..."

# Nombre de tentatives pour vérifier si Vault est prêt
attempts=0
max_attempts=5
sleep_time=5

while [[ $attempts -lt $max_attempts ]]; do
    # Vérifier l'état de Vault en utilisant l'API /v1/sys/health et extraire les champs initialized et sealed
    vault_status=$(curl -s http://vault:8200/v1/sys/health)
    initialized=$(echo "$vault_status" | jq -r '.initialized')
    sealed=$(echo "$vault_status" | jq -r '.sealed')

    if [[ "$initialized" == "true" && "$sealed" == "false" ]]; then
        echo "Vault is unsealed and ready."
        break
    else
        echo "Vault is sealed or not ready. Retrying in $sleep_time seconds..."
        attempts=$((attempts+1))
        sleep $sleep_time
    fi
done

if [[ $attempts -ge $max_attempts ]]; then
    echo "Vault is not ready after $max_attempts attempts. Exiting..."
    exit 1
fi

# Appeler le script de démarrage principal si nécessaire
exec /code/startup.sh