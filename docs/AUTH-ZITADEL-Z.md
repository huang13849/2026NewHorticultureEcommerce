# Zitadel 方案 Z SSO 运维备忘 (2026-07-04)

## 已完成配置
1. **Service User**: `login-ui-svc` (org 380209872962126024)
2. **PAT**: 10 年有效, 存 `~/.zitadel-svc-pat` + k8s Secret `zitadel-svc` (ns new-ecommerce)
3. **IAM Roles**: `IAM_LOGIN_CLIENT` + `IAM_OWNER`
4. **Org 密码策略**: minLength=6
5. **Instance Feature**: `loginV2.required=true`, `loginV2.baseUri=https://horiculture.club/`

## SSO 数据流
```
Browser -> app.horiculture.club (peony/tropical/etc)
        -> Zitadel /oauth/v2/authorize?client_id=...
        -> 302 https://horiculture.club/login?authRequest=V2_<id>
Browser -> horiculture.club/login (自建植物风登录页)
        -> POST /api/auth/zsession {phone, password, authRequestId}
next-app -> Zitadel /v2/sessions (checks: user+password)
         -> [若失败] ensureUser 或 resetPassword 双写
         -> Zitadel /v2/oidc/auth_requests/V2_<id> finalize(sessionId+Token)
         -> 返 callbackUrl
Browser -> 302 到 app callback ?code=xxx -> app 换 token 完成登录
```

## 一键重建 (换 Zitadel 后重跑)
```
bash scripts/zitadel-loginv2.sh
```

## OIDC 应用列表 (project horticulture-suite 380222121067938001)
| App | ClientID | Redirect |
|---|---|---|
| club-web | 380222397556523217 | horiculture.club/api/auth/callback/zitadel |
| space-web | 380222566284984529 | horiculture.space/api/auth/callback/zitadel |
| peony-app | 380222648929485009 | peony.horiculture.club/oidc/callback + 苏州 8081 |
| tropical-app | 380222686325899473 | tropical.horiculture.club/oidc/callback + 苏州 8082 |

## 已知边界
- **hostAliases** (k8s/flower-next.yaml): pod 内 `id.horiculture.club` -> zitadel svc ClusterIP 10.43.154.1
- Zitadel `ExternalDomain` 按 Host header 校验, 必须传 `Host: id.horiculture.club`
- `authRequestId` 保留 `V2_` 前缀, finalize 端点用完整字符串
- 密码双写: MongoDB (flower-api) + Zitadel, 前端登录成功后触发对齐

## 端到端测试脚本 (已通过 2026-07-04)
```bash
# 拿 authRequest
AR=$(curl -sD- -o /dev/null "http://100.96.54.109:31111/oauth/v2/authorize?client_id=380222648929485009&redirect_uri=http%3A%2F%2F106.12.91.182%3A8081%2Foidc%2Fcallback&response_type=code&scope=openid+profile+email&state=t" | grep -io "authRequest=[^ ]*" | cut -d= -f2 | tr -d "\r")

# 登录 + finalize
curl -s -X POST https://horiculture.club/api/auth/zsession \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"18511987921\",\"password\":\"123456\",\"authRequestId\":\"$AR\"}"
# 期望返回: {"callbackUrl":"http://106.12.91.182:8081/oidc/callback?code=...&state=t"}
```
