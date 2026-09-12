FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY image-bg.html /usr/share/nginx/html/image-bg.html
# 目录 755 才能 cd 进入, 文件 644 即可读
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \; && \
    cat > /etc/nginx/conf.d/default.conf <<"EOFCONF"
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri /index.html;
  }
  # tools backend 在 k8s cluster 内 (image-tools:3013), nginx 反代
  location /api/ {
    proxy_pass http://image-tools.new-ecommerce.svc.cluster.local:3013/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_request_buffering off;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
    client_max_body_size 50m;
  }
}
EOFCONF
