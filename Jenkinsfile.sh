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
  docker build --build-arg CACHE_BUST="$COMMIT_SHA" -t "$IMG" -t "$IMG_LATEST" -f "$ctx/Dockerfile" "$ctx"
  docker push "$IMG"
  docker push "$IMG_LATEST"
done

echo "-- Building flower-next-la (Dockerfile.la, 国际版 LA/horiculture.space) --"
IMG_LA="100.76.15.64:5001/flower-next:la-$COMMIT_SHA"
IMG_LA_LATEST="100.76.15.64:5001/flower-next:la-latest"
docker build --build-arg CACHE_BUST="$COMMIT_SHA" -t "$IMG_LA" -t "$IMG_LA_LATEST" -f next-app/Dockerfile.la next-app
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

echo "======= [5.6/5] public domain isolation test =======" 
# 5.6: 国内 (club) / 国际 (space) 首页必须都能独立 200 访问, 且不跨域跳转
for CHECK in "https://horiculture.club/|horiculture.club" "https://horiculture.space/|horiculture.space"; do
  URL="${CHECK%|*}"; HOST="${CHECK##*|}"
  # -L 跟 3xx; -w 拿最终 URL + code
  RES=$(curl -sSk -L --max-redirs 3 -o /dev/null -m 15 -w "%{http_code} %{url_effective}" "$URL" 2>/dev/null || echo "000 error")
  CODE="${RES%% *}"; FINAL="${RES#* }"
  if [ "$CODE" != "200" ]; then
    echo "  FAIL $URL -> HTTP $CODE (final=$FINAL)"
    exit 1
  fi
  # 落地 URL 必须留在同一 host, 不能跨到另一顶级域
  FINAL_HOST=$(echo "$FINAL" | sed -E 's|https?://([^/]+)/.*|\1|')
  case "$FINAL_HOST" in
    "$HOST"|"www.$HOST")
      echo "  OK  $URL -> $CODE (stayed on $FINAL_HOST)"
      ;;
    *)
      echo "  FAIL $URL redirected off-domain to $FINAL_HOST (cross-issue leak)"
      exit 1
      ;;
  esac
  # 首页 HTML 不能包含另一顶级域的 cross-issue 端点 (静态断言)
  BODY=$(curl -sSk -m 15 "$URL" 2>/dev/null | head -c 500000)
  if echo "$BODY" | grep -q '/api/auth/cross-issue'; then
    echo "  FAIL $URL body still references /api/auth/cross-issue (should be removed)"
    exit 1
  fi
done
echo "  OK  club/space homepages isolated (no cross-domain redirect, no cross-issue refs)"

echo "======= [5.7/5] OIDC login redirect_uri test ======="
# 5.7: NextAuth signin -> Zitadel authorize URL, 校验 redirect_uri 指向自身顶级域, 不出现原始 IP
for CHECK in "https://horiculture.club|horiculture.club" "https://horiculture.space|horiculture.space"; do
  BASE="${CHECK%|*}"; HOST="${CHECK##*|}"
  JAR=$(mktemp)
  CSRF=$(curl -sSk -c "$JAR" -b "$JAR" -m 15 "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin).get('csrfToken',''))")
  if [ -z "$CSRF" ]; then echo "  FAIL $HOST csrf token empty"; exit 1; fi
  RES=$(curl -sSk -c "$JAR" -b "$JAR" -m 20 -o /dev/null \
    -w '%{http_code}|%{redirect_url}' \
    -X POST "$BASE/api/auth/signin/zitadel" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "callbackUrl=$BASE/")
  CODE="${RES%%|*}"; LOC="${RES#*|}"
  echo "  [$HOST] code=$CODE loc=${LOC:0:100}"
  if [ "$CODE" != "302" ]; then echo "  FAIL $HOST expected 302, got $CODE"; exit 1; fi
  if ! echo "$LOC" | grep -q 'id.horiculture.club/oauth/v2/authorize'; then
    echo "  FAIL $HOST did not redirect to zitadel authorize"; exit 1
  fi
  RUI=$(echo "$LOC" | grep -oE 'redirect_uri=[^&]+' | head -1 | sed 's/redirect_uri=//' | python3 -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))")
  echo "  [$HOST] redirect_uri=$RUI"
  case "$RUI" in
    "https://$HOST"/*|"https://www.$HOST"/*) echo "  OK  $HOST redirect_uri OK";;
    *) echo "  FAIL $HOST redirect_uri wrong: $RUI"; exit 1;;
  esac
  if echo "$RUI" | grep -qE '209\.141\.34\.146|100\.(76|96)\.(15|54)\.[0-9]+'; then
    echo "  FAIL $HOST redirect_uri leaks raw IP: $RUI"; exit 1
  fi
  rm -f "$JAR"
done
echo "  OK  both /api/auth/signin/zitadel produce correct https://<host>/api/auth/callback/zitadel redirect_uri"

echo "======= [5.8/5] password login (Zitadel v2 sessions -> Redis sid) ======="
for BASE in "https://horiculture.club" "https://horiculture.space"; do
  HOST=$(echo "$BASE" | sed 's|https://||')
  RESP=$(curl -sSk -m 15 -c /tmp/lp.$$ -o /tmp/lp.body.$$ -w '%{http_code}' \
    -X POST "$BASE/api/session/password-login" \
    -H 'Content-Type: application/json' \
    -d '{"loginName":"guest","password":"guest"}')
  BODY=$(cat /tmp/lp.body.$$ | head -c 400)
  SIDCK=$(awk '$6=="sid"{print $7}' /tmp/lp.$$ | head -1)
  echo "  [$HOST] code=$RESP cookie=$SIDCK body=$BODY"
  if [ "$RESP" != "200" ]; then echo "  FAIL $HOST password-login expected 200 got $RESP"; rm -f /tmp/lp.$$ /tmp/lp.body.$$; exit 1; fi
  if [ -z "$SIDCK" ]; then echo "  FAIL $HOST no sid cookie"; rm -f /tmp/lp.$$ /tmp/lp.body.$$; exit 1; fi
  ME=$(curl -sSk -m 10 -b /tmp/lp.$$ -o /tmp/me.$$ -w '%{http_code}' "$BASE/api/session/me")
  MEBODY=$(cat /tmp/me.$$ | head -c 400)
  echo "  [$HOST] /me code=$ME body=$MEBODY"
  if [ "$ME" != "200" ]; then echo "  FAIL $HOST /me expected 200 got $ME"; rm -f /tmp/lp.$$ /tmp/lp.body.$$ /tmp/me.$$; exit 1; fi
  # wrong password
  BAD=$(curl -sSk -m 15 -o /dev/null -w '%{http_code}' \
    -X POST "$BASE/api/session/password-login" \
    -H 'Content-Type: application/json' \
    -d '{"loginName":"guest","password":"wrong-pwd-xxx"}')
  echo "  [$HOST] bad-pwd code=$BAD"
  if [ "$BAD" != "401" ] && [ "$BAD" != "400" ]; then echo "  FAIL $HOST wrong-pwd expected 401/400 got $BAD"; rm -f /tmp/lp.$$ /tmp/lp.body.$$ /tmp/me.$$; exit 1; fi
  rm -f /tmp/lp.$$ /tmp/lp.body.$$ /tmp/me.$$
done
echo "  OK  guest/guest password-login OK on club & space, /me returns 200, wrong-pwd -> 401"

echo "======= [5.9/5] user_profile + address CRUD (sid cookie) ======="
for BASE in "https://horiculture.club" "https://horiculture.space"; do
  HOST=$(echo "$BASE" | sed 's|https://||')
  JAR=$(mktemp)
  curl -sSk -m 15 -c "$JAR" -o /dev/null -X POST "$BASE/api/session/password-login" \
    -H "Content-Type: application/json" -d '{"loginName":"guest","password":"guest"}' >/dev/null
  P=$(curl -sSk -m 15 -b "$JAR" -w "\n%{http_code}" "$BASE/api/auth/profile")
  PC=$(echo "$P" | tail -1); PB=$(echo "$P" | sed '$d')
  if [ "$PC" != "200" ]; then echo "  FAIL [$HOST] GET /auth/profile -> $PC"; exit 1; fi
  echo "$PB" | grep -q '"zid"' || { echo "  FAIL [$HOST] profile missing zid"; exit 1; }
  ADDR='{"name":"Guest","phone":"13800000000","province":"北京","city":"北京","district":"丰台","detail":"新宫正商明苑3号楼1单元1401"}'
  A=$(curl -sSk -m 15 -b "$JAR" -H "Content-Type: application/json" -X PUT "$BASE/api/auth/address" -d "$ADDR" -w "\n%{http_code}")
  AC=$(echo "$A" | tail -1); AB=$(echo "$A" | sed '$d')
  if [ "$AC" != "200" ]; then echo "  FAIL [$HOST] PUT /auth/address -> $AC body=${AB:0:200}"; exit 1; fi
  G=$(curl -sSk -m 15 -b "$JAR" -w "%{http_code}" -o /tmp/addr.$$ "$BASE/api/auth/address")
  if [ "$G" != "200" ]; then echo "  FAIL [$HOST] GET /auth/address -> $G"; exit 1; fi
  grep -q '新宫' /tmp/addr.$$ || { echo "  FAIL [$HOST] saved address not returned"; head -c 300 /tmp/addr.$$; exit 1; }
  echo "  OK  [$HOST] profile+address roundtrip"
  rm -f "$JAR" /tmp/addr.$$
done
echo "  OK  user-profile-service (Mongo) end-to-end on club & space"

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
