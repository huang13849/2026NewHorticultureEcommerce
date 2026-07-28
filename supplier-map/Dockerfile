FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
RUN chmod 644 /usr/share/nginx/html/index.html && \
    cat > /etc/nginx/conf.d/default.conf <<'EOFCONF'
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
  location /api/ {
    proxy_pass http://100.96.54.109:3007/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header x-api-key ***REMOVED_API_KEY***;
  }
}
EOFCONF
