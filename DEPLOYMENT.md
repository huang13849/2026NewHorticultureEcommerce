# DEPLOYMENT.md — new-e-commerce 部署手册

> 最后更新: 2026-07-02
> 覆盖: 国内版 (中国大陆用户) 与国际版 (海外用户) 的完整生产部署

---

## 🌐 拓扑总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户流量入口                              │
└─────────────────────────────────────────────────────────────────┘
       ▲                                        ▲
       │ 国内用户                                │ 海外用户
       │                                         │
┌──────┴──────────────┐              ┌──────────┴──────────────┐
│ http://106.12.91.182│              │ https://horiculture.space│
│  苏州百度云 (BCE)    │              │  Cloudflare Pages 静态站 │
│  nginx-proxy:80     │              │  (SSG 静态 out/)         │
└──────┬──────────────┘              └──────────┬──────────────┘
       │                                         │
       │ 反代 Tailscale                          │ 图床回源
       │ 100.96.54.109:31xxx                     │ /minio/*
       │                                         ▼
       │                            ┌────────────────────────┐
       │                            │ 209.141.34.146 (LA VPS)│
       │                            │ nginx-proxy:80         │
       │                            │ 只做 CF Pages 图床回源  │
       │                            │ (LA MinIO :9000)       │
       │                            └────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│              k3s 集群 (namespace: new-ecommerce)              │
│              master: 100.96.54.109 (ubun-master, 北京)        │
│                                                               │
│   flower-next    :31000 → 3000  (Next.js SSR/前端)            │
│   flower-api     :31010 → 3010  (Express 业务 API)            │
│   seo-service    :31011 → 3011  (SEO/analytics)               │
│   supplier-map   :31307 → 80    (静态 nginx, 供应商地图)       │
│   dealer-map     :31308 → 80    (静态 nginx, 经销商地图)       │
└──────────────────────────────────────────────────────────────┘
       │
       │ Next.js rewrites (server-side, next.config.ts)
       │
       ├─▶ /api/mongo/*    → api-gateway-origin:3007 (host 网关)
       ├─▶ /api/seo/*      → seo-service.svc:3011
       ├─▶ /api/analytics/*→ seo-service.svc:3011
       ├─▶ /supplier-map/* → supplier-map.svc:80
       ├─▶ /dealer-map/*   → dealer-map.svc:80
       └─▶ /api/*          → flower-api.svc:3010
                            └─▶ MongoDB @ RPi8 (100.67.126.90)
                                PostgreSQL @ RPi8
                                Redis @ ubun-master
                                MinIO @ ubun-master:9000
```

---

## 🚀 双入口设计

### 国内版入口 → k3s
- **面向用户**: 中国大陆
- **URL**: `http://106.12.91.182/`
- **链路**: 苏州 nginx → Tailscale → k3s master NodePort → pod
- **优点**: 用国内百度云 IP，走 Tailscale 内网到 k3s，延迟 30-90ms

### 国际版入口 → Cloudflare Pages
- **面向用户**: 海外
- **URL**: `https://horiculture.space/`
- **链路**: GitHub push → CF Pages build (`NEXT_PUBLIC_REGION=global`, `output: 'export'`) → CF CDN 静态托管
- **图床回源**: `/minio/*` → 209.141.34.146:9000 (LA MinIO)
- **优点**: 全球 CDN、免服务器、TLS 自动

**核心分工**:
- k3s = 中国大陆生产 + 一切服务端渲染
- CF Pages = 海外静态站 + 图床走 LA MinIO 回源
- **一套源码 / 两个构建目标 / 各走各的 CI**

---

## 🔨 CI/CD 流程

### 双仓库配置
```
本地 next-app/ 项目
    ├─▶ GitHub: git@github.com:huang13849/2026NewHorticultureEcommerce.git
    │      └─▶ CF Pages watch main branch → 自动 build → horiculture.space
    │
    └─▶ Gitea:  http://100.96.54.109:30330/huangyi/new-ecommerce.git
           └─▶ Jenkins SCM Poll (每 5 分钟) → build → k3s deploy
```

### 更新代码的标准流程

**在 Mac Mini `/Volumes/NVME1TB/dev2026/new-e-commerce/` 修改代码**:
```bash
git add . && git commit -m "feat: xxx"
git push origin main    # 触发 CF Pages 构建 (国际版)
```

**在 ubuntu-master `~/2026NewHorticultureEcommerce/` 同步到 Gitea**:
```bash
# 拉最新
git pull origin main
# 推 Gitea 触发 Jenkins
git push gitea main
```

**⚠️ 如果两边不同步**: 优先用 GitHub 作为主源，Gitea 是 k3s CI/CD 的镜像。


### Jenkins Job
- Job 名: `new-ecommerce-k3s`
- URL: http://100.96.54.109:30880/job/new-ecommerce-k3s/
- 触发: SCM Poll `H/5 * * * *` (每 5 分钟拉 Gitea)
- Pipeline 脚本: `/var/jenkins_home/pipeline/nec-k3s-pipeline.sh` (52 行)

Pipeline 4 阶段:
1. **build**: `docker build` 5 个服务
2. **push**: 推到 `100.76.15.64:5001` (Mac Mini registry)
3. **deploy**: `kubectl set image` rolling update
4. **system-test**: smoke test 5 个 NodePort

### 手动触发构建 (CSRF 认证)
```bash
COOKIE=/tmp/jk-cookie
CRUMB_JSON=$(curl -s -c $COOKIE -u admin:admin "http://100.96.54.109:30880/crumbIssuer/api/json")
CRUMB_FIELD=$(echo $CRUMB_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)['crumbRequestField'])")
CRUMB_VAL=$(echo   $CRUMB_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)['crumb'])")
curl -s -b $COOKIE -u admin:admin -H "$CRUMB_FIELD: $CRUMB_VAL" \
  -X POST "http://100.96.54.109:30880/job/new-ecommerce-k3s/build"
```

---

## 📦 k3s 部署明细

### namespace 和资源
```bash
export KUBECONFIG=~/k3s.yaml   # 避免 sudo

kubectl -n new-ecommerce get all
```

| Deployment | Replicas | Node | Image | Service Port |
|---|---|---|---|---|
| flower-next | 1 | ubun-master (nodeSelector `hostname=huangfra-ubun-master-ms-7e11`) | `100.76.15.64:5001/flower-next:latest` | NodePort 31000 → 3000 |
| flower-api | 1 | 同上 | `.../flower-api:latest` | NodePort 31010 → 3010 |
| seo-service | 1 | 同上 | `.../seo-service:latest` | NodePort 31011 → 3011 |
| supplier-map | 1 | 同上 | `.../supplier-map:latest` | NodePort 31307 → 80 |
| dealer-map | 1 | 同上 | `.../dealer-map:latest` | NodePort 31308 → 80 |

**为什么只跑在 master node**: 后端依赖（MongoDB API Gateway `100.96.54.109:3007`, Redis, MinIO）都在 master 上，跑在同机避免跨节点网络开销。

### k3s 节点分布 (可用于将来分区调度)
| Node | Zone | Location | Ready | 备注 |
|---|---|---|---|---|
| huangfra-ubun-master-ms-7e11 | cn | beijing | ✅ | k3s server, 后端主力 |
| instance-2rd1s9qh (suzhou-baidu) | cn | suzhou | ✅ | k3s agent (2026-06 加入), 目前不承载 workload |
| k8s.node1 (LA VPS) | us | la | ✅ | k3s agent (2026-07 加入), 目前不承载 workload |
| huangnvmefxubun-desktop (RPi8) | - | - | ✅ | arm64, 备用 |
| xspt05 (office WSL) | - | - | ✅ | 备用 |

### 镜像仓库
- **地址**: `100.76.15.64:5001` (Mac Mini, HTTP insecure)
- **k3s registries.yaml**: `/etc/rancher/k3s/registries.yaml` 已声明 insecure
- **Mac Mini Docker PATH**: `export PATH=$HOME/.docker/bin:/usr/local/bin:$PATH`

---

## 🔀 Next.js rewrites 配置 (关键)

`next-app/next.config.ts` 里根据 `NEXT_PUBLIC_REGION` 分两种模式:

### `NEXT_PUBLIC_REGION=global` (CF Pages 用)
- `output: 'export'` → 静态导出
- 不生成 rewrites (静态站没 server)
- API 请求由 CF Workers / 前端硬编码域名处理

### 默认 (k3s / server-side 用)
- `output: 'standalone'`
- 生成 rewrites 表:
  ```
  /api/mongo/*    → api-gateway-origin.new-ecommerce.svc:3007
  /api/seo/*      → seo-service.svc:3011
  /api/analytics/*→ seo-service.svc:3011
  /supplier-map/* → supplier-map.svc:80
  /dealer-map/*   → dealer-map.svc:80
  /api/*          → flower-api.svc:3010
  ```

**⚠️ 修改 next.config.ts 时**: 环境变量可通过 k8s Deployment env 传入（`API_GATEWAY_URL` / `SUPPLIER_MAP_URL` 等）。

---

## 🌍 苏州 nginx 反代配置

**位置**: 苏州百度云 `106.12.91.182:/root/docker-nginx/nginx.conf`
**运行**: `nginx-proxy` docker 容器
**入口**: `http://106.12.91.182/` (80)

关键 location:
```nginx
location / {                     → k3s_flower_next  (100.96.54.109:31000)
location /api/ {                 → k3s_flower_api   (100.96.54.109:31010)
location /api/mongo/ {           → 100.96.54.109:3007 (api-gateway 直连)
location /seo-api/ {             → k3s_seo_service  (100.96.54.109:31011)
location /supplier-map/ {        → k3s_supplier_map (100.96.54.109:31307)
location /dealer-map/ {          → k3s_dealer_map   (100.96.54.109:31308)
location /minio/ {               → 苏州本机 minio:9000 (图床)
```

**修改后 reload**:
```bash
docker exec nginx-proxy nginx -t
docker exec nginx-proxy nginx -s reload
```

**⚠️ 苏州机器不再跑 flower-next/flower-api/seo-service 容器**（2026-07-02 已移除）。docker-compose.suzhou.yml 保留服务定义仅供回滚参考。

---

## 🌏 LA VPS 定位

**位置**: `209.141.34.146` (root/f012db38382d13d6)

**当前唯一职责**: Cloudflare Pages 国际版的**图床回源**
- `http://209.141.34.146/minio/*` → LA MinIO :9000
- `http://209.141.34.146/supply-chain/*` → LA MinIO :9000

**不承载 k3s workload**:
- 磁盘仅 20GB / 内存 965MB，资源紧张
- 已加入 k3s 集群 (zone=us, location=la)，但**未来仅备用**，不主动调度
- 国际版首页永远走 CF Pages 静态

---

## 🗄️ 数据源

| 服务 | 位置 | 用途 |
|---|---|---|
| MongoDB (supply_chain) | RPi8 100.67.126.90:27017 (master) + RPi4 (slave) | 商品/供应商/经销商/订单 |
| MongoDB API Gateway | ubun-master 100.96.54.109:3007 | 统一 `/api/mongo/*` 出口, 需要 `x-api-key: flower-app-key-2024` |
| PostgreSQL (primary) | RPi8 100.67.126.90:5432 | supply_chain 库 |
| PostgreSQL (standby) | Mac Mini 100.76.15.64:5432 | 只读备库 |
| Redis | ubun-master :6379 | 缓存/session |
| MinIO (国内) | ubun-master :9000 bucket `supply-chain` | 图片主存 |
| MinIO (国际) | LA :9000 | CF Pages 图床回源 |

---

## 🛠 常见运维操作

### 更新代码走标准 CI/CD
```bash
# Mac Mini 上开发
cd /Volumes/NVME1TB/dev2026/new-e-commerce
# ... 修改 ...
git add . && git commit -m "..."
git push origin main   # CF Pages 自动 build 国际版

# ubuntu-master 上同步给 Gitea
ssh huangfra-ubun-master@100.96.54.109
cd ~/2026NewHorticultureEcommerce
git pull origin main
git push gitea main    # 5 分钟内 Jenkins 自动构建部署到 k3s
```

### 手动查看 k3s 部署状态
```bash
export KUBECONFIG=~/k3s.yaml
kubectl -n new-ecommerce get pods -o wide
kubectl -n new-ecommerce logs -l app=flower-next --tail=50
kubectl -n new-ecommerce rollout status deployment/flower-next
```

### 手动重启单个服务
```bash
kubectl -n new-ecommerce rollout restart deployment/flower-next
```

### 回滚
```bash
kubectl -n new-ecommerce rollout history deployment/flower-next
kubectl -n new-ecommerce rollout undo deployment/flower-next
```

### 查看当前流量 (苏州入口)
```bash
ssh root@106.12.91.182 "docker exec nginx-proxy tail -f /var/log/nginx/access.log"
```

### 验证端到端 (每次改 CI 后跑一遍)
```bash
# 国内版
curl -sSI http://106.12.91.182/ | head -5
curl -sS  http://106.12.91.182/api/mongo/supplier?limit=1 -H 'x-api-key: flower-app-key-2024' | head -c 200

# 国际版
curl -sSI https://horiculture.space/ | head -5

# k3s 直连
curl -sSI http://100.96.54.109:31000/ | head -5
```

---

## 🔐 关键凭据 (⚠️ 不要提交到 git)

| 服务 | 用户 / Token | 位置 |
|---|---|---|
| ubuntu-master SSH | huangfra-ubun-master / 123456 | ~/.ssh (Tailscale IP 100.96.54.109) |
| suzhou-baidu SSH | root / Hy@11111111 | 106.12.91.182 |
| LA VPS SSH | root / f012db38382d13d6 | 209.141.34.146 |
| Gitea | huangyi / (token in `git remote -v`) | http://100.96.54.109:30330 |
| Jenkins | admin / admin | http://100.96.54.109:30880 |
| MongoDB API Gateway | x-api-key: flower-app-key-2024 | HTTP header |
| k3s kubeconfig | `~/k3s.yaml` | ubuntu-master |

---

## 📚 相关文档

- `AGENTS.md` — AI agent 快速上手指南
- `next-app/next.config.ts` — Next.js 双模式配置
- `k8s/*.yaml` — k3s Deployment/Service manifests
- `docker-compose.suzhou.yml` — 苏州 docker-compose 定义 (已归档, 仅 minio 在跑)

---

## 📜 变更历史

- **2026-07-02** 苏州机 flower-next/api/seo 容器停止, 全量切到 k3s 反代
- **2026-07-02** LA VPS 加入 k3s (zone=us), 但仅备用不承载 workload
- **2026-07-02** next.config.ts 增加 k3s 内 service 反代 rewrites (修 /map JSON parse error)
- **2026-06-29** k3s new-ecommerce namespace 5 服务全绿, Jenkins CI/CD 打通
