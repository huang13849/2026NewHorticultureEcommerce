FROM 100.76.15.64:5001/image-tools:v5-20260911022330

WORKDIR /app

# u2net 模型 baked in
COPY .u2net /app/.u2net
RUN ls -la /app/.u2net/

# 新版 server.py (兼容老 flask, 用 Response 不用 send_file headers 关键字)
COPY server.py ./server.py

ENV PORT=3013
ENV U2NET_HOME=/app/.u2net
EXPOSE 3013

CMD ["gunicorn", "-w", "2", "-k", "gthread", "--threads", "4", "-b", "0.0.0.0:3013", "--timeout", "300", "--access-logfile", "-", "server:app"]
