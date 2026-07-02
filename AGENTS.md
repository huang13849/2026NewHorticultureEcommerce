# AGENTS.md — AI Agent 快速上手

> 给未来的 Claude / Codex / 其他 agent 使用
> 项目: new-e-commerce (2026NewHorticultureEcommerce)
> 最后更新: 2026-07-02

---

## 🎯 30 秒了解项目

**这是什么**: 双入口花卉电商平台 (Next.js 15 + Express + MongoDB)
- 国内版: `http://106.12.91.182/` → 苏州 nginx → k3s
- 国际版: `https://horiculture.space/` → Cloudflare Pages (SSG 静态)
- **一套代码, 两个构建目标**

**代码在哪**:
- 主源: GitHub `huang13849/2026NewHorticultureEcommerce`
- k3s CI 源: Gitea `100.96.54.109:30330/huangyi/new-ecommerce`
- 本地开发: Mac Mini `/Volumes/NVME1TB/dev2026/new-e-commerce/`
- 服务器操作: ubuntu-master `~/2026NewHorticultureEcommerce/`

---

## 📖 修改代码流程 (最重要)

```bash
# 1. Mac Mini 开发
cd /Volumes/NVME1TB/dev2026/new-e-commerce
# ...修改...
git add . && git commit -m "..."
git push origin main   # → 触发 CF Pages 自动 build 国际版

# 2. 同步给 k3s (国内版走 Jenkins)
ssh huangfra-ubun-master@100.96.54.109
cd ~/2026NewHorticultureEcommerce
git pull origin main
git push gitea main    # → 5 分钟内 Jenkins 自动 build+deploy 到 k3s
```

**⚠️ 不要直接编辑 ubuntu-master 上的代码**, 会造成两边不同步。除非是紧急修 CI 相关（Jenkinsfile / k8s manifests）。

---

## 🔍 关键位置速查

| 想干什么 | 去哪 |
|---|---|
| 看部署详情 | `DEPLOYMENT.md` (根目录) |
| 前端代码 | `next-app/src/` |
| 后端 API | `backend/routes/*.js` |
| 后端入口 | `backend/server.js` |
| k8s manifest | `k8s/*.yaml` |
| Dockerfile (k3s/CN) | `next-app/Dockerfile`, `backend/Dockerfile`, 等 |
| Dockerfile (国际备用) | `next-app/Dockerfile` (build-arg 切换) |
| Next.js rewrites 配置 | `next-app/next.config.ts` |
| Jenkins pipeline | `/var/jenkins_home/pipeline/nec-k3s-pipeline.sh` (在 ubuntu-master 上) |
| 苏州 nginx | `106.12.91.182:/root/docker-nginx/nginx.conf` |
| LA nginx | `209.141.34.146:/opt/monitor-nginx/nginx.conf` (只图床) |

---

## 🚨 常见坑

### 1. 代码同步坑
- **两个 remote (origin=GitHub, gitea=本地)**, push 忘了另一个就会出现 CF Pages 已更新但 k3s 没更新（反之亦然）
- **服务器上直接改代码 → push gitea → 忘了 push origin**, 会导致 GitHub 落后
- 修复: 用 `git push gitea main && git push origin main` 双 push

### 2. Next.js rewrites 环境
- CF Pages build 时 `NEXT_PUBLIC_REGION=global` → `output: 'export'` (静态), rewrites **不生效**
- k3s build 时无此环境 → `output: 'standalone'` (SSR), rewrites 生效
- 直接访问 `100.96.54.109:31000/api/mongo/xxx` 需要 rewrites, 否则前端 fetch 会得到 404 HTML 而报 `Unexpected token '<'`

### 3. MongoDB API Gateway 需要 header
```
GET /api/mongo/supplier?limit=1
Header: x-api-key: ***REMOVED_API_KEY***
```
苏州 nginx 已在 `/api/mongo/` location 加了 `proxy_set_header x-api-key`, 但 k3s NodePort 直连需要手动带.

### 4. kubectl 需要 KUBECONFIG
```bash
export KUBECONFIG=~/k3s.yaml   # 免 sudo, 用户 huangfra-ubun-master
kubectl -n new-ecommerce get pods
```
不要用 sudo kubectl, 用户已经配好 kubeconfig.

### 5. Mac Mini docker 需要 PATH
```bash
export PATH=$HOME/.docker/bin:/usr/local/bin:$PATH
```
在 Mac Mini 上跑 docker 命令前必须先跑这个 (Docker Desktop 没自动进 PATH).

### 6. 苏州机不再跑 flower-next
2026-07-02 起, 苏州机的 `flower-next` `flower-api` `seo-service` 容器已删除, 全部走 k3s 反代. 如果看到有人建议在苏州机 `docker compose up flower-next`, **别照做**, 会撞端口冲突或跑一份废资源.

### 7. LA VPS 内存只有 965MB
不要在 LA 上跑重型 workload. 目前只有 nginx-proxy (图床) + minio + prometheus exporters + k3s-agent (备用).

---

## 🛠 常用工具

### 查看 pod 日志
```bash
export KUBECONFIG=~/k3s.yaml
kubectl -n new-ecommerce logs -l app=flower-next --tail=100 -f
```

### 强制重启单个服务
```bash
kubectl -n new-ecommerce rollout restart deployment/flower-next
```

### 手动触发 Jenkins build (改 pipeline 时用)
```bash
COOKIE=/tmp/jk-cookie
CRUMB_JSON=$(curl -s -c $COOKIE -u admin:admin "http://100.96.54.109:30880/crumbIssuer/api/json")
CRUMB_FIELD=$(echo $CRUMB_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)['crumbRequestField'])")
CRUMB_VAL=$(echo   $CRUMB_JSON | python3 -c "import json,sys;print(json.load(sys.stdin)['crumb'])")
curl -s -b $COOKIE -u admin:admin -H "$CRUMB_FIELD: $CRUMB_VAL" \
  -X POST "http://100.96.54.109:30880/job/new-ecommerce-k3s/build"
```

### 查看构建结果
```bash
curl -s -u admin:admin "http://100.96.54.109:30880/job/new-ecommerce-k3s/lastBuild/api/json?tree=result,building,number"
curl -s -u admin:admin "http://100.96.54.109:30880/job/new-ecommerce-k3s/lastBuild/consoleText" | tail -30
```

### 端到端验证 (改完必跑)
```bash
# 国内
curl -sSI http://106.12.91.182/  | head -3
curl -sSI http://100.96.54.109:31000/ | head -3

# 国际
curl -sSI https://horiculture.space/ | head -3

# API
curl -sS -H 'x-api-key: ***REMOVED_API_KEY***' \
  'http://100.96.54.109:31000/api/mongo/supplier?limit=1' | head -c 100
```

---

## 🧭 决策原则

**该在哪加代码**:
- 通用业务/UI → `next-app/`, 两边都会用
- 国内特有 (支付宝/微信/中文默认) → 用 `IS_CN` (`next-app/src/lib/deploy.ts`) 判断
- 国际特有 (Stripe/PayPal/英文默认) → 判断 `!IS_CN`
- **不要**新建 `next-app-cn/` `next-app-global/` 两个目录, 违反 "一套代码" 原则

**该跑在哪**:
- 后端服务 (flower-api, seo, api-gateway) → k3s (ubun-master)
- 前端 SSR → k3s
- 静态站海外 → CF Pages
- 图床 → 国内 MinIO (ubun-master) + 海外 MinIO (LA)
- 数据库 → RPi8/RPi4 (Tailscale 内网)

**加新 k3s 服务时**:
1. 在 `k8s/` 建 `<svc>.yaml` (Deployment + Service NodePort)
2. NodePort 用 `31xxx` 段 (避免冲突, 参考现有分配)
3. 在 `next.config.ts` rewrites 添加对应路由
4. `nec-k3s-pipeline.sh` build 阶段加 docker build
5. Push Gitea 触发部署, 验证 pod ready
6. **更新 DEPLOYMENT.md**

---

## 📚 更多细节

- 完整拓扑 + 数据源 + 凭据: `DEPLOYMENT.md`
- 修复历史 / 变更日志: `DEPLOYMENT.md` 末尾
