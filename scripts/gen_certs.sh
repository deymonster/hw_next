#!/bin/bash

# Выход при ошибке
set -e

# Папка для сертификатов
CERT_DIR="../certs"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

echo "=== Generating CA (Certificate Authority) ==="
# 1. Генерируем ключ CA
openssl genrsa -out ca.key 4096
# 2. Генерируем сертификат CA (действителен 365 дней)
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/C=RU/ST=State/L=City/O=HWMonitor/CN=HWMonitorRootCA"

echo "=== Generating Server Certificate (localhost) ==="
# 3. Ключ сервера
openssl genrsa -out server.key 2096
# 4. CSR (Certificate Signing Request) для сервера
openssl req -new -key server.key -out server.csr -subj "/C=RU/ST=State/L=City/O=HWMonitor/CN=localhost"
# 5. Конфиг для SAN (Subject Alternative Name) - важно для Go и современных браузеров
cat > server-ext.cnf <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = license.hw-monitor.local
IP.1 = 127.0.0.1
IP.2 = 192.168.13.162
EOF
# 6. Подписываем сертификат сервера нашим CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256 -extfile server-ext.cnf

echo "=== Generating Client Certificate ==="
# 7. Ключ клиента (licd)
openssl genrsa -out client.key 2096
# 8. CSR клиента
openssl req -new -key client.key -out client.csr -subj "/C=RU/ST=State/L=City/O=HWMonitor/CN=licd-client"
# 9. Подписываем сертификат клиента нашим CA
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 365 -sha256

echo "=== Cleanup ==="
rm *.csr *.cnf

echo "=== Success! Certificates generated in $CERT_DIR ==="
ls -l