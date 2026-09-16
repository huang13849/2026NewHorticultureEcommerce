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

### 8. k3s `flower-next` service 跟 `flower-next-la` 共用 selector
⚠️ **2026-09-16 大坑**: k3s master 上有个老 service `flower-next` (NodePort 31000), selector 是 `app=flower-next-la`。
我部署的国际版 `flower-next-la` pod 也带这个 label。结果是:
- 任何走 k3s 31000 的请求 (包括 suzhou nginx-proxy 上游) 都会最终落到 LA VPS-209 上的 `flower-next-la` pod
- 想按域名分流 (`.club` 走国内 / `.space` 走国际) 必须在 nginx 上游分, 不能指望 service 分

**修复**: suzhou nginx-proxy 改 upstream:
```
upstream k3s_flower_next  { server 127.0.0.1:3000; keepalive 32; }   # ← 本地 flower-next (国内版)
upstream k3s_flower_api   { server 127.0.0.1:3010; keepalive 32; }
```
**.club 走本地 docker**, **.space 走 VPS-209 hostPort 32000**, 各自独立.

### 9. Suzhou `nginx-proxy` 容器文件系统 read-only + mmap locked
想 `docker cp` / `cat > file` / `mv` 替换 `/etc/nginx/nginx.conf` 全失败 (musl/alpine + nginx mmap)。
只能 `docker rm` + 用 `-v /path/on/host:/etc/nginx/nginx.conf:ro` 重建容器。

完整复现命令见坑 #11 的 setup。

### 10. Suzhou `nginx-proxy` 容器 cert 不在 `/etc/nginx/certs/`
真 cert 在 suzhou 宿主机 `/root/docker-nginx/certs/`, **目录是空的** (历史上挂过但源没了)。
重建容器前必须先 `cp /root/docker-nginx/certs/*.{crt,key} /etc/nginx/certs/`。
缺失任何 cert 都会触发 `cannot load certificate ... No such file or directory` emerg → 容器 restart loop。

### 11. Suzhou Dockerfile.suzhou 改完 rebuild 标准流程
```bash
# 1. 在 Mac Mini 上改 ~/suzhou-cn/new-ecommerce/next-app/Dockerfile.suzhou
# 2. SCP 到 suzhou (用 paramiko SFTP, 不要用 ssh echo + base64 — 命令行长):
python3 -c "
import paramiko
suz = paramiko.SSHClient()
suz.set_missing_host_key_policy(paramiko.AutoAddPolicy())
suz.connect('100.127.108.33', 22, 'root', 'Hy@11111111', look_for_keys=False)
sftp = suz.open_sftp()
sftp.put('/Users/huangframacmini/suzhou-cn/new-ecommerce/next-app/Dockerfile.suzhou', '/root/new-ecommerce/next-app/Dockerfile.suzhou')
suz.close()
"
# 3. 在 suzhou build + restart
ssh root@106.12.91.182
cd /root/new-ecommerce
PATH=/usr/bin:$PATH docker compose -f docker-compose.suzhou.yml build flower-next
PATH=/usr/bin:$PATH docker compose -f docker-compose.suzhou.yml up -d flower-next
```
**注意**: Suzhou 没有 `docker-compose` (v1), 只有 docker v2 → `docker compose` 空格语法.
Docker CLI 路径 `/usr/bin/docker`, 不是 `/usr/local/bin/docker`.
**Dockerfile.suzhou 不在 suzhou working tree** (git 历史里有但 working tree 只有改过的 `Dockerfile`), 改前一定要从 Mac Mini 传过去。

### 12. ICP 备案号注入 (zh.json + page.tsx)
国内合规必须有 ICP 备案号显示在 footer。改 3 个文件:

```bash
# 1. zh.json 加键 (中文版才显示):
"footer": {
  ...
  "icp": "京ICP备2026007606号-2",
  "beian_url": "https://beian.miit.gov.cn/"
}

# 2. en.json 加空值 (英文版不显示):
"footer": {
  ...
  "icp": "",
  "beian_url": ""
}

# 3. page.tsx footer 后插入 ICP 行 (在 </footer> 后面):
<div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-stone-200/60 text-center text-[11px] text-stone-400">
  <a href={t('home.footer.beian_url') || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-stone-600 transition-colors">
    {t('home.footer.icp')}
  </a>
</div>
```
改完 scp 3 文件到 suzhou 正确路径 (`/root/new-ecommerce/next-app/src/lib/i18n/{zh,en}.json` + `/app/page.tsx`), 然后 build + restart. 公网 `.club` HTML 就能看到带 `beian.miit.gov.cn` 链接的 ICP 号。

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
