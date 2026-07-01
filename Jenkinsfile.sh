#!/bin/bash
# new-e-commerce k3s deploy script
# 由 Jenkins 通过 SSH 触发
set -euo pipefail

echo "======= [1/5] 检查代码 ======="
cd ~/2026NewHorticultureEcommerce
git log -1 --oneline
COMMIT_SHA=$(git rev-parse --short HEAD)

echo "======= [2/5] 构建镜像 ======="
export KUBECONFIG=$HOME/k3s.yaml
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

echo "======= [3/5] 部署到 k3s ======="
kubectl apply -f k8s/
for svc in "${!SVC_CTX[@]}"; do
  kubectl -n new-ecommerce set image deployment/$svc $svc=100.76.15.64:5001/$svc:$COMMIT_SHA
done

echo "======= [4/5] 等 rollout ======="
for svc in "${!SVC_CTX[@]}"; do
  kubectl -n new-ecommerce rollout status deployment/$svc --timeout=180s
done

echo "======= [5/5] system-test (retry 5x) ======="
for check in "31010:404" "31000:200" "31011:200" "31307:200" "31308:200"; do
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

echo "======= DEPLOY SUCCESS: $COMMIT_SHA ======="
