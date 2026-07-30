# Future Agent Business Reference

日期：2026-07-30  
用途：给未来接入的 agent 快速建立业务、部署、运维与知识检索上下文。  
范围：Jetson 上的 `openclaw` / `hermes` 资产、Mac mini / K3s / Gitea / CMDB 现状，以及 `supply-chain-platform`、`new-e-commerce`、相关运维 skill 与输出文档。

## 1. 这份资料的结论先看

- 未来 agent 的最佳入口不是单一业务仓库，而是“**Gitea 仓库 + Codex/Hermes 记忆 + skill 参考 + CMDB 文档**”组合。
- Jetson 上与业务最相关的长期知识目前主要沉淀在 `hermes` 的 imported skills，而不是 `.codex/memories`。
- 当前最值得保留给 future agent 的四类上下文：
  - **服务器与连接语义**：`server-connector`
  - **供应链业务与发布经验**：`supply-chain-platform`
  - **新电商双入口部署经验**：`new-e-commerce`
  - **CMDB / Gitea / K3s / Mongo / Zitadel 迁移与现状**

## 2. Jetson 上的知识资产位置

Jetson 主机：`100.117.85.50`  
用户名：`jetson_huangfra`  
本次整理只做了只读盘点，未修改远端内容。

### 2.1 发现到的关键目录

- `~/.hermes/memories/`
- `~/.hermes/skills/openclaw-imports/server-connector/`
- `~/.hermes/skills/openclaw-imports/supply-chain-platform/`
- `~/.openclaw/`
- `~/.codex/skills/`
- `~/.codex/memories/`

### 2.2 当前判断

- `~/.codex/memories/` 本次扫描时没有形成可直接复用的业务记忆命中。
- `~/.hermes/memories/MEMORY.md` / `USER.md` 对本轮关键词没有明显命中，说明 **Hermes 的业务经验更多沉淀在 imported skills**。
- `~/.openclaw/` 更像运行态、状态与工作区，不适合直接当业务知识库；更适合作为“原始上下文来源”。

## 3. 最重要的 skills 与它们分别解决什么

### 3.1 `server-connector`

来源：Jetson `~/.hermes/skills/openclaw-imports/server-connector/SKILL.md`

这个 skill 是未来 agent 接入你整个运维环境的第一把钥匙，核心作用：

- 统一通过 SSH 连接远端 Linux / Ubuntu 主机
- 沉淀了远端编辑、验证、回滚、Jenkins、k3s、Docker 的大量踩坑经验
- 明确要求：**改完必须验证，验证优先于解释**

已知它覆盖的服务器语义（本次仅保留角色，不在仓库中固化密码）：

- `ubuntu-master`：供应链主运维入口、Docker / K3s / Jenkins / Gitea 上下文关键节点
- `mac-mini`：本地 Docker / CMDB / registry / 部分数据库承载
- `rpi8` / `rp4`：Mongo / PostgreSQL 等数据承载节点
- `office` / `office2` / `office-wsl`：监控、WSL、K3s 节点与高可用组件
- `suzhou`：国内入口与图片存储相关
- `la-k8s` / `vps-209`：海外入口、图床与新电商全球流量相关

这个 skill 中值得 future agent 继承的规则：

- 不要大范围扫家目录，先做定向检索
- 远端修改优先“备份 → 改动 → 验证”
- Docker / k3s / Jenkins 的部署验证要看实际运行产物，不只看源码
- 多个服务已经从 Docker 迁到了 k3s，不能按旧部署方式想当然处理

### 3.2 `supply-chain-platform`

来源：Jetson `~/.hermes/skills/openclaw-imports/supply-chain-platform/SKILL.md`

这个 skill 是供应链业务与部署经验的聚合层，重点覆盖：

- `product-service` / `order-service` / `nginx-gateway`
- Mongo 到 PostgreSQL 的过渡经验
- Jenkins CI/CD、k3s 发布、NodePort 与跨服务调用
- 标签体系、用户体系、页面热修复、构建与回滚套路

对 future agent 最有价值的不是“具体命令”，而是这些 **可复用判断**：

- 先判断服务现在跑在 Docker 还是 k3s，再决定怎么改
- 用户报前端问题时，优先去前端层定位，不要跨层乱修
- 发布成败要看“构建产物是否真的进了容器 / pod”
- 多端共享能力（标签、用户、检索）要做服务端权威源，不要只落浏览器本地

### 3.3 `new-e-commerce` 项目自带 AGENTS / DEPLOYMENT

来源：

- `/Volumes/NVME1TB/dev2026/new-e-commerce/AGENTS.md`
- `/Volumes/NVME1TB/dev2026/new-e-commerce/DEPLOYMENT.md`

它们已经构成了一个非常好的项目级 onboarding 包，future agent 应优先看这两份：

- `AGENTS.md`：30 秒了解项目、代码修改流程、关键位置速查、常见坑
- `DEPLOYMENT.md`：双入口拓扑、CI/CD、k3s 部署明细、GitHub / Gitea / Jenkins 链路

## 4. 业务与部署现状速记

### 4.1 `new-e-commerce`

当前是“一套代码、双入口部署”：

- 国内入口：国内 nginx / Tailscale / k3s `new-ecommerce` namespace
- 海外入口：Cloudflare Pages 静态站
- 代码主源：GitHub
- k3s CI 源：Gitea 镜像仓库

future agent 需要优先记住：

- GitHub 是主源，Gitea 更偏 k3s 发布镜像源
- 国内链路依赖 k3s / Jenkins / 本地 registry
- 海外链路依赖 GitHub → CF Pages
- 跨服务默认地址必须区分：同集群走 svc DNS，跨机房/跨节点再走 Tailscale + NodePort

### 4.2 `supply-chain-platform`

当前是运维复杂度最高、知识最容易分散的系统之一：

- 一部分历史服务曾经在 Docker
- 一部分已经迁到 k3s
- 页面、标签、用户、订单、搜索、网关都有大量历史演化

future agent 要优先问自己的问题：

- 这次改的是源码层、容器层，还是 k3s 部署层？
- 现在线上入口到底是哪个服务、哪个 NodePort、哪个镜像？
- 改完是要推 Jenkins，还是只做临时 hotfix？

### 4.3 K3s 与 CMDB / Gitea / Zitadel

本地记忆里已经明确了这些事实：

- K3s 曾出现节点 `xsyysj` `NotReady`、镜像拉取失败、NodeSelector 硬绑定等问题
- Gitea 已优先从 K3s 抽离到 Mac mini Compose，且当前本地 Gitea 是**新实例**，不是历史 Longhorn 数据完全恢复
- K3s 原 Gitea 的 Longhorn 副本曾经 faulted / detached，历史数据不可恢复
- Zitadel 迁入 Compose 时，本质也是**本地替代实例**思路，不应误称完整历史迁移

这对 future agent 的含义是：

- “现在服务可用”不等于“历史数据已完整迁回”
- 做恢复、迁移、对账时要明确区分：
  - 新实例替代
  - 逻辑数据迁移
  - 历史卷恢复

### 4.4 MongoDB 现状

本地记忆已经核实：

- `mongodb-master-2` 是 `rs0` 的一个成员
- Mac mini 上该成员是 secondary，不是 primary
- 不能直接把旧副本数据卷粗暴挂到新的 Compose 服务里当“迁移”

future agent 应遵守：

- 涉及 Mongo 副本集时，优先做**认证后的拓扑确认**
- 数据迁移优先走**逻辑导出 / 导入**
- 不要把“统一纳管容器定义”误当成“安全迁移数据”

## 5. 与未来 agent 最相关的本地记忆主题

本机 Codex memory 已经沉淀出几条很关键的复用知识：

- **Gitea 迁移与修复**
  - 本地 Compose Gitea 为新实例
  - 历史贡献与默认分支修复要看 `HEAD`、默认分支和作者邮箱
  - `attempt to write a readonly database` 常见原因是挂载目录属主错误

- **K3s 恢复**
  - 先看 `sudo kubectl get nodes -o wide`
  - 再看 `sudo kubectl get pods -A -o wide`
  - Pending 可能是调度、镜像拉取、应用崩溃三类完全不同原因

- **CMDB 方向**
  - Mac mini 上的 `cmdb` 更适合作为统一入口与知识底座
  - `next-ai-drawio` 可以迁入 CMDB Docker 体系
  - 图纸版本可交给 Gitea，元数据与关系后续适合纳入更明确的数据层

- **Zitadel 与 PostgreSQL**
  - Zitadel 本地 Compose 是 fresh replacement 思路
  - 不要把没有旧库 dump 的替代实例叫做完整迁移

## 6. 本次一并归档的 output 文档

这两份文档建议和本手册放在一起，作为 CMDB / 架构 / 迁移上下文补充：

- `cmdb-next-ai-drawio-pg-plan-2026-07-27.md`
- `cmdb-next-ai-drawio-migration-runbook-2026-07-27.md`

它们补充了两类信息：

- `next-ai-drawio` 迁入 Mac mini 的资源、依赖、落位建议
- PostgreSQL / pgbouncer / CMDB 架构的阶段性规划

## 7. 给 future agent 的推荐阅读顺序

如果未来有 agent 首次接入，建议按这个顺序加载上下文：

1. 本文档
2. `new-e-commerce/AGENTS.md`
3. `new-e-commerce/DEPLOYMENT.md`
4. Jetson `server-connector/SKILL.md`
5. Jetson `supply-chain-platform/SKILL.md`
6. 本地 Codex memory 中与 Gitea / K3s / Mongo / Zitadel / CMDB 相关条目
7. 本次一起归档的两份 output 文档

## 8. 明确不建议 future agent 做的事

- 不要把密码、API Key、数据库密钥直接固化进业务仓库文档
- 不要把 fresh replacement 写成历史完整迁移
- 不要在没确认运行拓扑前，默认某个服务还跑在 Docker
- 不要只看源码就宣布“已发布”，必须看容器 / pod / 页面或 API 实际结果
- 不要在远端全盘乱搜，先从 skill、AGENTS、DEPLOYMENT、memory 定点进入

## 9. 后续建议

如果要把这套资料真正变成 future agent 的稳定入口，下一步最值得做的是：

- 在 CMDB 中给 `server`、`service`、`repo`、`deployment`、`document` 建一层可检索关系
- 把 Gitea 仓库、Jenkins job、K3s namespace、Docker Compose 服务都挂到统一资产图里
- 为 `server-connector` / `supply-chain-platform` / `new-e-commerce` 再做一层“摘要索引”，让 agent 可以先读摘要，再跳原文
