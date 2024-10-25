storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = true
}

disable_mlock = true
api_addr = "http://localhost:8200"
cluster_addr = "http://localhost:8201"
log_level = "warn"