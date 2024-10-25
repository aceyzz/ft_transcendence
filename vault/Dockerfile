FROM hashicorp/vault:1.18

RUN apk add --no-cache curl jq

# config et init
RUN mkdir -p /vault/config
COPY config/config.hcl /vault/config/config.hcl
COPY script/entrypoint.sh /vault/entrypoint.sh
RUN chmod +x /vault/entrypoint.sh

# lets go
ENTRYPOINT ["sh", "/vault/entrypoint.sh"]