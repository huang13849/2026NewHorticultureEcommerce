#!/usr/bin/env bash
# system-test/image-isolation.sh
# 验证:club → 苏州 MinIO,space → LA MinIO,双站独立,API 返相对路径
set -u
FAIL=0
pass(){ echo "  ✓ $*"; }
fail(){ echo "  ✗ $*"; FAIL=$((FAIL+1)); }
etag(){ curl -sIk -m 10 "$1" | tr -d '\r' | awk 'tolower($1)=="etag:"{print $2}'; }
code(){ curl -sk -o /dev/null -w '%{http_code}' -m 10 "$1"; }

PIC="products/1783064614589-698z2v-image.jpg"

echo "=== TEST 1: API 返相对路径,不含硬编码 host ==="
for domain in horiculture.club horiculture.space; do
  J=$(curl -sk -L "https://$domain/api/products?isListed=true&limit=20" -H 'Accept: application/json' 2>/dev/null)
  if echo "$J" | grep -qE 'https?://(horiculture\.(club|space)|106\.12\.91\.182|209\.141\.34\.146|100\.96\.54\.109|100\.76\.15\.64)/(minio|supply-chain)'; then
    fail "$domain API 仍含硬编码 minio host"
    echo "$J" | grep -oE 'https?://[^"]{5,60}/(minio|supply-chain)/' | sort -u | head -3
  else
    pass "$domain API 返 /minio/supply-chain/ 相对路径"
  fi
done

echo
echo "=== TEST 2: club 域图片 = 苏州 MinIO(同 ETag) ==="
CLUB=$(etag "https://horiculture.club/minio/supply-chain/$PIC")
SUZ=$(etag "https://106-12-91-182.sslip.io/minio/supply-chain/$PIC")
echo "  club:            $CLUB"
echo "  suzhou (sslip):  $SUZ"
if [ -n "$CLUB" ] && [ "$CLUB" = "$SUZ" ]; then
  pass "club → 苏州 MinIO"
else
  fail "club 域图片 ETag 不匹配苏州"
fi

echo
echo "=== TEST 3: space 域图片 = LA MinIO(同 ETag) ==="
SP=$(etag "https://horiculture.space/minio/supply-chain/$PIC")
LA=$(etag "http://209.141.34.146/minio/supply-chain/$PIC")
echo "  space: $SP"
echo "  la:    $LA"
if [ -n "$SP" ] && [ "$SP" = "$LA" ]; then
  pass "space → LA MinIO"
else
  fail "space 域图片 ETag 不匹配 LA"
fi

echo
echo "=== TEST 4: 4 条链路都健康 ==="
BAD=0
for u in "https://horiculture.club/minio/supply-chain/$PIC" \
         "https://horiculture.space/minio/supply-chain/$PIC" \
         "https://106-12-91-182.sslip.io/minio/supply-chain/$PIC" \
         "http://209.141.34.146/minio/supply-chain/$PIC"; do
  c=$(code "$u")
  echo "  $u → $c"
  [ "$c" = "200" ] || BAD=$((BAD+1))
done
[ $BAD -eq 0 ] && pass "4 条链路全 200" || fail "$BAD 条链路失败"

echo
echo "=== TEST 5: 前端 chunks 不含硬编码国内 host ==="
BAD=0
for host in horiculture.club horiculture.space; do
  CHUNKS=$(curl -sk "https://$host/" 2>/dev/null | grep -oE '/_next/static/chunks/[a-z0-9_-]+\.js' | sort -u)
  for j in $CHUNKS; do
    if curl -sk "https://$host$j" 2>/dev/null | grep -qE 'https?://(horiculture\.(club|space)|106\.12\.91\.182|209\.141\.34\.146)/minio/'; then
      fail "$host chunk $j 硬编码 minio URL"
      BAD=$((BAD+1))
    fi
  done
done
[ $BAD -eq 0 ] && pass "前端 chunks 全部同源"

echo
echo "=== TEST 6: 双站独立性(club 挂了不影响 space) ==="
# 通过 API 返回值不含 space host 且 space 返回值不含 club host 保证
J1=$(curl -sk -L "https://horiculture.club/api/products?limit=5" 2>/dev/null)
J2=$(curl -sk -L "https://horiculture.space/api/products?limit=5" 2>/dev/null)
if echo "$J1" | grep -q "horiculture.space"; then fail "club API 里出现 space host"; else pass "club API 无 space 依赖"; fi
if echo "$J2" | grep -q "horiculture.club"; then fail "space API 里出现 club host"; else pass "space API 无 club 依赖"; fi

echo
if [ $FAIL -eq 0 ]; then
  echo "=== ✅ ALL PASS ==="
  exit 0
else
  echo "=== ❌ $FAIL FAILURES ==="
  exit 1
fi
