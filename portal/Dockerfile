FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
# 目录需要 755 才能 cd 进入, 文件 644 即可读
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} \; && \
    cat > /etc/nginx/conf.d/default.conf <<'EOFCONF'
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
}
EOFCONF