#!/usr/bin/env bash
# System Test: horiculture.club 全域 SSO + 单点登出
# 覆盖 peony (子路径 app), tropical (子路径 app), 主域 next-app
set -uo pipefail
CJ=/tmp/systest-sso-$$
CJ_EMPTY=/tmp/systest-empty-$$
rm -f $CJ $CJ_EMPTY

PHONE="18511987921"
PASS="123456"
PASS_BAD="wrong-pass"
PASS=${SSO_PASS:-$PASS}

PASSED=0; FAILED=0; TESTS=()

pass(){ echo "  ✅ $1"; PASSED=$((PASSED+1)); TESTS+=("PASS: $1"); }
fail(){ echo "  ❌ $1  ($2)"; FAILED=$((FAILED+1)); TESTS+=("FAIL: $1  ($2)"); }

section(){ echo; echo "━━━ $1 ━━━"; }

# ==========================================================
section "TC-01 未登录访问三站, 应返回登录页面 / 401 bridge"
# ==========================================================
rm -f $CJ
code=$(curl -sm10 -c $CJ -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/peony/api/mobile-auth/session-bridge" -H "Content-Type: application/json" -d '{"tenant":"peony"}')
[ "$code" = "401" ] && pass "peony bridge 无 cookie -> 401" || fail "peony bridge 无 cookie" "got $code"

code=$(curl -sm10 -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/tropical/api/mobile-auth/session-bridge" -H "Content-Type: application/json" -d '{"tenant":"tropical"}')
[ "$code" = "401" ] && pass "tropical bridge 无 cookie -> 401" || fail "tropical bridge 无 cookie" "got $code"

code=$(curl -sm10 -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/api/auth/sso-restore")
[ "$code" = "401" ] && pass "主域 sso-restore 无 cookie -> 401" || fail "主域 sso-restore 无 cookie" "got $code"

# 前端页面能打开
for path in peony tropical; do
  code=$(curl -sm10 -o /dev/null -w "%{http_code}" "https://horiculture.club/$path/")
  [ "$code" = "200" ] && pass "GET /$path/ -> 200" || fail "GET /$path/" "got $code"
done
code=$(curl -sm10 -o /dev/null -w "%{http_code}" "https://horiculture.club/")
[ "$code" = "200" ] && pass "GET / -> 200" || fail "GET /" "got $code"

# ==========================================================
section "TC-02 peony 表单登录 - 走 Zitadel Session API"
# ==========================================================
rm -f $CJ
# 错密码 -> 401
r=$(curl -sm10 -c $CJ -o /tmp/badpw.$$ -w "%{http_code}" -X POST "https://horiculture.club/peony/api/mobile-auth/zitadel-login" -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS_BAD\"}")
[ "$r" = "401" ] && pass "peony 错密码 -> 401" || fail "peony 错密码" "got $r"
grep -q "Password is invalid" /tmp/badpw.$$ && pass "错密码错误来自 Zitadel" || fail "错密码错误消息" "not from zitadel"
rm -f /tmp/badpw.$$

# 正确密码
rm -f $CJ
r=$(curl -sm10 -c $CJ -o /tmp/okpw.$$ -w "%{http_code}" -X POST "https://horiculture.club/peony/api/mobile-auth/zitadel-login" -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}")
[ "$r" = "200" ] && pass "peony 正确密码 -> 200" || fail "peony 正确密码" "got $r"
grep -q '"token":' /tmp/okpw.$$ && pass "返回 peony JWT" || fail "返回 peony JWT" "no token"
rm -f /tmp/okpw.$$

# cookie 落地
grep -q "zitadel.session" $CJ && pass "zitadel.session cookie 已落地" || fail "zitadel.session cookie 未落地" "not in jar"
grep "zitadel.session" $CJ | grep -q ".horiculture.club" && pass "cookie Domain=.horiculture.club" || fail "cookie Domain" "wrong domain"

# ==========================================================
section "TC-03 SSO 跨站免密登录 (同 cookie)"
# ==========================================================
# tropical
r=$(curl -sm10 -b $CJ -o /tmp/trbr.$$ -w "%{http_code}" -X POST "https://horiculture.club/tropical/api/mobile-auth/session-bridge" -H "Content-Type: application/json" -d '{"tenant":"tropical"}')
[ "$r" = "200" ] && pass "tropical 带 cookie session-bridge -> 200" || fail "tropical bridge" "got $r"
grep -q '"token":' /tmp/trbr.$$ && pass "tropical 返回本地 JWT" || fail "tropical JWT" "no token"
rm -f /tmp/trbr.$$

# 主域
r=$(curl -sm10 -b $CJ -c $CJ -o /tmp/rst.$$ -w "%{http_code}" -X POST "https://horiculture.club/api/auth/sso-restore")
[ "$r" = "200" ] && pass "主域 sso-restore 带 cookie -> 200" || fail "主域 sso-restore" "got $r"
grep -q '"token":' /tmp/rst.$$ && pass "主域返回 flower JWT" || fail "主域 flower JWT" "no token"
grep -q "flower_token" $CJ && pass "flower_token cookie 已下发" || fail "flower_token cookie" "not set"
rm -f /tmp/rst.$$

# ==========================================================
section "TC-04 单点登出 (SLO)"
# ==========================================================
# 主域 sso-logout
resp_headers=/tmp/logout.$$
curl -sm10 -b $CJ -c $CJ -o /dev/null -D $resp_headers -X POST "https://horiculture.club/api/auth/sso-logout" >/dev/null
grep -qi "^set-cookie: zitadel.session=; " $resp_headers && pass "sso-logout 清 zitadel.session" || fail "sso-logout zitadel.session" "no set-cookie"
grep -qi "^set-cookie: flower_token=;" $resp_headers && pass "sso-logout 清 flower_token" || fail "sso-logout flower_token" "no set-cookie"
rm -f $resp_headers

# 之后各站应全 401
for entry in "peony/api/mobile-auth/session-bridge" "tropical/api/mobile-auth/session-bridge"; do
  r=$(curl -sm10 -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/$entry" -H "Content-Type: application/json" -d "{}")
  [ "$r" = "401" ] && pass "登出后 $entry -> 401" || fail "登出后 $entry" "got $r"
done
r=$(curl -sm10 -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/api/auth/sso-restore")
[ "$r" = "401" ] && pass "登出后 主域 sso-restore -> 401" || fail "登出后 主域 sso-restore" "got $r"

# ==========================================================
section "TC-05 mobile-auth /logout (peony/tropical 页面登出按钮走此)"
# ==========================================================
rm -f $CJ
# 重新登录 peony
curl -sm10 -c $CJ -o /dev/null -X POST "https://horiculture.club/peony/api/mobile-auth/zitadel-login" -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}"

resp_headers=/tmp/mlogout.$$
curl -sm10 -b $CJ -c $CJ -o /dev/null -D $resp_headers -X POST "https://horiculture.club/peony/api/mobile-auth/logout"
grep -qi "^set-cookie: zitadel.session=; " $resp_headers && pass "mobile-auth logout 清 zitadel.session" || fail "m-logout zitadel.session" "no clear"
grep -qi "^set-cookie: flower_token=" $resp_headers && pass "mobile-auth logout 清 flower_token" || fail "m-logout flower_token" "not cleared"

r=$(curl -sm10 -b $CJ -o /dev/null -w "%{http_code}" -X POST "https://horiculture.club/tropical/api/mobile-auth/session-bridge" -H "Content-Type: application/json" -d '{"tenant":"tropical"}')
[ "$r" = "401" ] && pass "peony 登出后 tropical -> 401 (跨站登出)" || fail "跨站登出 tropical" "got $r"
rm -f $resp_headers

# ==========================================================
section "TC-06 前端页面产物已修 (静态断言)"
# ==========================================================
peony_js=$(curl -sm10 "https://horiculture.club/peony/app.js")
echo "$peony_js" | grep -q "hasZCookie\|hasCookie" && fail "peony app.js 仍有 hasCookie 探测" "found" || pass "peony 已无 hasCookie 探测"
echo "$peony_js" | grep -q "await ensureGuestToken()" && fail "peony bootstrap 仍在自动 guest" "found" || pass "peony bootstrap 无自动 guest"

trop_js=$(curl -sm10 "https://horiculture.club/tropical/app.js")
echo "$trop_js" | grep -q "hasCookie" && fail "tropical app.js 仍有 hasCookie 探测" "found" || pass "tropical 已无 hasCookie 探测"

echo
echo "============================================================"
echo "SYSTEM TEST 完成: PASSED=$PASSED  FAILED=$FAILED"
echo "============================================================"
for line in "${TESTS[@]}"; do echo "$line"; done
[ $FAILED -eq 0 ] && exit 0 || exit 1
