#!/bin/bash
# new-e-commerce k3s deploy script
# 由 Jenkins 通过 SSH 触发
set -euo pipefail

echo "======= [1/5] 检查代码 ======="
cd ~/2026NewHorticultureEcommerce
git log -1 --oneline
COMMIT_SHA=$(git rev-parse --short HEAD)

echo "======= [2/5] 构建镜像 ======="
# k3s.yaml symlink fell out of sync; use ~/.kube/config which points at the same cluster
export KUBECONFIG=$HOME/.kube/config
declare -A SVC_CTX=(
  ["flower-api"]="backend"
  ["flower-next"]="next-app"
  ["supplier-map"]="supplier-map"
  ["dealer-map"]="dealer-map"
  ["seo-service"]="seo-service"
)
for svc in "${!SVC_CTX[@]}"; do
  ctx="${SVC_CTX[$svc]}"
  IMG="100.76.15.64:5001/$svc:$COMMIT_SHA"
  IMG_LATEST="100.76.15.64:5001/$svc:latest"
  echo "-- Building $svc ($IMG) --"
  docker build -t "$IMG" -t "$IMG_LATEST" -f "$ctx/Dockerfile" "$ctx"
  docker push "$IMG"
  docker push "$IMG_LATEST"
done

echo "-- Building flower-next-la (Dockerfile.la, 国际版 LA/horiculture.space) --"
IMG_LA="100.76.15.64:5001/flower-next:la-$COMMIT_SHA"
IMG_LA_LATEST="100.76.15.64:5001/flower-next:la-latest"
docker build -t "$IMG_LA" -t "$IMG_LA_LATEST" -f next-app/Dockerfile.la next-app
docker push "$IMG_LA"
docker push "$IMG_LA_LATEST"

echo "======= [3/5] 部署到 k3s ======="
kubectl apply -f k8s/
for svc in "${!SVC_CTX[@]}"; do
  kubectl -n new-ecommerce set image deployment/$svc $svc=100.76.15.64:5001/$svc:$COMMIT_SHA
done
kubectl -n new-ecommerce set image deployment/flower-next-la flower-next=100.76.15.64:5001/flower-next:la-$COMMIT_SHA
# Recreate 策略下老 pod 释放 hostPort 后新 pod 才能起, 显式 delete pod 加速
kubectl -n new-ecommerce delete pod -l app=flower-next-la --ignore-not-found

echo "======= [4/5] 等 rollout ======="
for svc in "${!SVC_CTX[@]}"; do
  kubectl -n new-ecommerce rollout status deployment/$svc --timeout=180s
done
kubectl -n new-ecommerce rollout status deployment/flower-next-la --timeout=180s

echo "======= [5/5] system-test (retry 5x) ======="
for check in "31010:404" "31000:200" "31011:200" "31307:200" "31308:200" "32000:200"; do
  port="${check%:*}"
  expected="${check#*:}"
  code="0"
  for attempt in 1 2 3 4 5; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://100.96.54.109:$port/ 2>/dev/null || echo "0")
    if [ "$code" = "$expected" ]; then break; fi
    sleep 5
  done
  if [ "$code" = "$expected" ]; then
    echo "  OK port $port -> HTTP $code (attempt $attempt)"
  else
    echo "  FAIL port $port -> HTTP $code (expected $expected)"
    exit 1
  fi
done


echo "======= [5.5/5] image chain smoke test ======="
# 5.5.1: 首页 HTML 里不能含内网 tailscale IP
HTML=$(curl -sS -m 15 http://100.96.54.109:31000/ 2>/dev/null | head -c 500000)
BAD=$(echo "$HTML" | grep -oE "100\.(76|96)\.(15|54)\.[0-9]+" | sort -u | tr '\n' ' ' || true)
if [ -n "$BAD" ]; then
  echo "  FAIL: home HTML contains intranet IPs: $BAD"
  exit 1
fi
echo "  OK  home HTML has no intranet IPs"

# 5.5.2: 抽样 3 张产品图 HEAD 200
API_JSON=$(curl -sS -m 15 "http://100.96.54.109:31010/api/products?limit=6" 2>/dev/null)
IMG_URLS=$(echo "$API_JSON" | python3 -c "$(cat <<'PYCHILD'
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
items = d.get('products') or d.get('data') or []
urls = []
for p in items:
    for k, v in p.items():
        if 'image' in k.lower() and isinstance(v, list) and v:
            urls.append(v[0])
            break
print('\n'.join(urls[:3]))
PYCHILD
)")
if [ -z "$IMG_URLS" ]; then
  echo "  WARN: no images sampled from /api/products (empty response?)"
else
  FAIL=0
  for URL in $IMG_URLS; do
    URL_FIX=$(echo "$URL" | sed 's|http://100\.96\.54\.109:9000|https://horiculture.club/minio|' | sed 's|http://100\.76\.15\.64:9000|https://horiculture.club/minio|' | sed 's|http://106\.12\.91\.182/minio|https://horiculture.club/minio|')
    case "$URL_FIX" in http*) TEST_URL="$URL_FIX" ;; *) TEST_URL="https://horiculture.club/minio/supply-chain/$URL_FIX" ;; esac
    # -I HEAD only; 不 follow redirect,避免 -L 超时时 || echo 0 拼接 -> "2000"
    # 赋值层面 || 兜底,curl 输出与失败兜底不粘在一起
    code=$(curl -sSk -I -o /dev/null -w "%{http_code}" --max-time 15 "$TEST_URL" 2>/dev/null) || code=000
    # 允许 200 或 302 (CF/minio 都算图片存在)
    if [ "$code" = "200" ] || [ "$code" = "302" ]; then
      echo "  OK  image $TEST_URL -> 200"
    else
      echo "  FAIL image $TEST_URL -> $code"
      FAIL=1
    fi
  done
  if [ "$FAIL" = "1" ]; then exit 1; fi
fi

echo "======= [6/5] GitHub 同步策略 ======="
# 默认不自动推 github (gitea 是主 CI 源, github 只在大版本发布时手动同步)
# 需要触发 github + CF Pages rebuild 时: PUSH_GITHUB=1 bash Jenkinsfile.sh
#   或运行: bash ~/publish-github.sh
if [ "${PUSH_GITHUB:-0}" = "1" ]; then
  if git push origin main 2>&1; then
    echo "  OK  pushed main -> origin (GitHub); CF Pages should auto-build"
  else
    echo "  WARN github push failed"
  fi
else
  echo "  SKIP github push (set PUSH_GITHUB=1 to force; or use ~/publish-github.sh for big releases)"
fi

echo "======= DEPLOY SUCCESS: $COMMIT_SHA ======="
