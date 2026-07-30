# next-ai-drawio 迁移到 Mac mini CMDB Runbook

日期：2026-07-27

## 1. 当前核实结果

- K3s 当前运行组件：
  - `next-ai-drawio`
  - `doubao-proxy`
- 当前入口：
  - `next-ai-drawio` 通过 `NodePort 30811` 对外
  - `doubao-proxy` 仅集群内 `8088`
- 当前资源占用：
  - `next-ai-drawio` 约 `1m CPU / 63Mi RAM`
  - `doubao-proxy` 约 `1m CPU / 13Mi RAM`
- 当前没有 PVC，也没有服务端本地持久卷依赖

结论：这组服务适合直接迁入 Mac mini Docker，由现有 `cmdb` 网络统一接管。

## 2. 推荐落位

- 服务归属：
  - `next-ai-drawio` 作为 `cmdb` 的架构图绘制前端
  - `doubao-proxy` 作为其内部 AI 适配代理
- 数据分层：
  - 图纸文件放 Gitea 仓库，例如 `architecture-diagrams`
  - 未来图纸元数据、关系索引放 PostgreSQL
  - 如果只是短期缓存或临时草稿，可放 MongoDB，但不建议把正式元数据长期压在 MongoDB

## 3. 为什么现在就能迁

- 计算压力很小，Mac mini Docker 足够承载
- 服务没有 PVC 迁移成本
- 当前 PG 接入层已经基本具备后续接元数据的条件
- `next-ai-drawio` 本体现在并不依赖 PostgreSQL，可先迁服务、后接元数据

## 4. 建议部署结构

- 容器：
  - `cmdb-next-ai-drawio`
  - `cmdb-doubao-proxy`
- Docker 网络：
  - 如果并入当前主 compose，使用 `cmdb-net`
  - 如果单独起一个 compose 文件，外部网络名应写成现有实际网络 `cmdb_cmdb-net`
- 端口建议：
  - `next-ai-drawio` 对外 `13010`
  - `doubao-proxy` 仅内部暴露，不开宿主机端口
- 配置方式：
  - 敏感变量放 `.env.next-ai-drawio`
  - `DOUBAO_BASE_URL` 指向内部服务 `http://cmdb-doubao-proxy:8088/api/v3`

## 5. 推荐执行顺序

1. 在 `cmdb` 目录中加入 compose 片段和 `doubao_proxy.py`
2. 创建 `.env.next-ai-drawio`，填入实际模型名和 API Key
3. `docker compose up -d`
4. 本机访问 `http://localhost:13010`
5. 验证 AI 生图、导出、保存到 Git 仓库的流程
6. 再做第二阶段的元数据接入

## 6. 第二阶段建议

### 6.1 PostgreSQL 用途

适合放：

- 图纸目录
- 图纸标签
- 服务与图纸关系
- 组件之间的上下游关系
- 变更记录索引

### 6.2 MongoDB 用途

适合放：

- 临时草稿
- 会话缓存
- 非强关系的 AI 对话上下文

不建议放：

- 核心 CMDB 关系模型
- 长期权威元数据

## 7. 风险点

- 当前镜像 `ghcr.io/wangfenghuan/w-next-ai-drawio:latest` 依赖外部拉取，建议后续同步到你自己的 registry
- `.env` 里的 `DOUBAO_API_KEY` 需要重新核对，不建议直接复用旧集群清单到公开文件
- 如果后面要接 Zitadel，再补 OAuth 回调和鉴权层，不要现在一起耦合进去

## 8. 本轮结论

现在最合适的做法不是继续把 `next-ai-drawio` 留在 K3s，而是把它直接迁入 Mac mini 的 `cmdb` Docker 体系，并把图纸版本交给 Gitea、把未来元数据交给 PostgreSQL。
