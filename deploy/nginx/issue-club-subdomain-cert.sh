#!/bin/bash
# 给 horiculture.club 子域 (peony/tropical) 签 LE 证书 + 追加 :443 server + 复制 cert 到 certs/ + reload
# 用法: bash issue-club-subdomain-cert.sh peony.horiculture.club
set -e
DOMAIN="${1:?Usage: $0 <fqdn>}"
CERT_DIR=/root/docker-nginx/certs
LE_DIR=/root/docker-nginx/letsencrypt
WEBROOT=/root/docker-nginx/acme-challenge
NGINX_CONF=/root/docker-nginx/nginx.conf

# 前置: DNS 已解析到 106.12.91.182
IP=$(dig +short "$DOMAIN" @8.8.8.8 | head -1)
if [ "$IP" != "106.12.91.182" ]; then
  echo "!!! $DOMAIN 未解析到 106.12.91.182 (当前=$IP), 请先加 DNS A 记录"
  exit 1
fi
echo "[1/4] certbot webroot $DOMAIN"
certbot certonly --webroot -w "$WEBROOT" \
  --config-dir "$LE_DIR" \
  --work-dir /var/lib/letsencrypt-suzhou \
  --logs-dir /var/log/letsencrypt-suzhou \
  --non-interactive --agree-tos --email admin@horiculture.club \
  --cert-name "$DOMAIN" -d "$DOMAIN"

echo "[2/4] copy to certs/"
cp "$LE_DIR/live/$DOMAIN/fullchain.pem" "$CERT_DIR/$DOMAIN.crt"
cp "$LE_DIR/live/$DOMAIN/privkey.pem"   "$CERT_DIR/$DOMAIN.key"
chmod 600 "$CERT_DIR/$DOMAIN.key"

echo "[3/4] 追加 :443 vhost 到 nginx.conf"
if grep -q "server_name $DOMAIN;" "$NGINX_CONF" && ! grep -q "listen 443 ssl;\s*$" "$NGINX_CONF" 2>/dev/null; then
  # 简单版: 在 stub_status 前追加
  UPSTREAM=k3s_peony_web
  [ "$DOMAIN" = "tropical.horiculture.club" ] && UPSTREAM=k3s_tropical_web
  MAX=60s
  [ "$UPSTREAM" = "k3s_tropical_web" ] && MAX=120s
  BODY=50m
  cat > /tmp/vhost443.conf <<CONF
    server {
        listen 443 ssl;
        http2 on;
        server_name $DOMAIN;
        client_max_body_size 40m;
        ssl_certificate     /etc/nginx/certs/$DOMAIN.crt;
        ssl_certificate_key /etc/nginx/certs/$DOMAIN.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        location / {
            proxy_pass http://$UPSTREAM;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout $MAX;
        }
    }
CONF
  # 插到 stub_status 前
  awk -v ins="$(cat /tmp/vhost443.conf)" '/stub_status：仅供/ && !x {print ins; x=1} {print}' "$NGINX_CONF" > /tmp/nginx.new
  cp "$NGINX_CONF" "$NGINX_CONF.bak-cert-$(date +%s)"
  mv /tmp/nginx.new "$NGINX_CONF"
fi

echo "[4/4] reload nginx-proxy"
docker exec nginx-proxy nginx -t
docker exec nginx-proxy nginx -s reload
echo "DONE: https://$DOMAIN/"
