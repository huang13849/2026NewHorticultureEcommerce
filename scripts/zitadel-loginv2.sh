#!/bin/bash
# Zitadel LoginV2 feature 一键启用 + 指向自建登录页
# 用法: bash zitadel-loginv2.sh [pat_file]
set -e
PAT_FILE="${1:-$HOME/.zitadel-svc-pat}"
PAT="$(cat "$PAT_FILE")"
BASE="${ZITADEL_BASE:-http://100.96.54.109:31111}"
BASEURI="${LOGIN_V2_BASE:-https://horiculture.club/}"

echo "[1/2] 启用 LoginV2 baseUri=$BASEURI"
curl -sw "\n" -X PUT "$BASE/v2/features/instance" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d "{\"loginV2\":{\"required\":true,\"baseUri\":\"$BASEURI\"}}"

echo "[2/2] 验证"
curl -s -H "Authorization: Bearer *** "$BASE/v2/features/instance" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(' loginV2:',d.get('loginV2'))"
