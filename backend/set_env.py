import os
import hvac

def set_vault_env():
	# Charger les détails de Vault depuis le fichier .vault_env
	try:
		with open("/vault-secrets/.vault_env", "r") as f:
			for line in f:
				name, value = line.strip().split("=", 1)
				os.environ[name] = value
	except Exception as e:
		print(f"Error loading .vault_env file: {e}")
		exit(1)

	vault_addr = os.environ.get("VAULT_ADDR")
	vault_token = os.environ.get("VAULT_TOKEN")

	if not vault_addr or not vault_token:
		print("Vault address or token not found in environment variables")
		exit(1)

	# Créer un client Vault
	client = hvac.Client(url=vault_addr, token=vault_token)

	if not client.is_authenticated():
		print("Failed to authenticate with Vault")
		exit(1)

	# Récupérer les secrets depuis Vault
	secret_path = "project-env"
	try:
		response = client.secrets.kv.read_secret_version(path=secret_path)
		secrets = response["data"]["data"]
	except Exception as e:
		print(f"Error fetching secrets from Vault: {e}")
		exit(1)

	# Définir les secrets comme variables d'environnement
	for key, value in secrets.items():
		os.environ[key] = value

if __name__ == "__main__":
	set_vault_env()