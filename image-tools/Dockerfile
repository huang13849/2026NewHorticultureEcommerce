FROM 100.76.15.64:5001/library/python:3.11-slim-amd64

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
        libjpeg62-turbo-dev zlib1g-dev libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 依赖
RUN pip install --no-cache-dir --root-user-action=ignore \
        flask==3.0.3 \
        pillow==10.4.0 \
        "rembg[cpu]==2.0.59" \
        gunicorn==23.0.0 \
        python-docx==1.1.2

# 简历源文件 (模板 + JD + AGENTS + 已有简历)
COPY resume_src /app/resume_src

# u2net 模型 (baked in, baked layer cache)
COPY .u2net /app/.u2net
RUN ls -la /app/.u2net/

COPY server.py ./server.py

ENV PORT=3013
ENV U2NET_HOME=/app/.u2net
EXPOSE 3013

CMD ["gunicorn", "-w", "2", "-k", "gthread", "--threads", "4", \
     "-b", "0.0.0.0:3013", "--timeout", "300", "--access-logfile", "-", \
     "server:app"]
