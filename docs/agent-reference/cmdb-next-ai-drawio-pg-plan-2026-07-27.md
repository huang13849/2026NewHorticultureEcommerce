# CMDB / next-ai-drawio / PostgreSQL 规划

日期：2026-07-27

## 1. 当前核实结果

### 1.1 next-ai-drawio 在 K3s 中的现状

- Namespace：`drawio`
- 工作负载：
  - `deployment/next-ai-drawio`
  - `deployment/doubao-proxy`
- 对外入口：
  - `service/next-ai-drawio`：`NodePort 30811 -> 3000`
- 内部依赖：
  - `service/doubao-proxy`：`ClusterIP:8088`
  - `secret/next-ai-drawio-env`
- 资源配置：
  - `next-ai-drawio`：request `100m CPU / 256Mi RAM`，limit `1 CPU / 1Gi RAM`
  - `doubao-proxy`：request `20m CPU / 32Mi RAM`，limit `300m CPU / 128Mi RAM`
- 实时观测：
  - `next-ai-drawio` 约 `1m CPU / 63Mi RAM`
  - `doubao-proxy` 约 `1m CPU / 13Mi RAM`
- 存储：
  - 无 PVC
  - 当前没有服务端持久卷依赖

结论：`next-ai-drawio` 是轻量服务，迁入 Mac mini Docker 没有算力或磁盘压力。

### 1.2 Mac mini Docker 当前负载

- `cmdb-gitea`：约 `130MiB`
- `registry`：约 `42MiB`
- `mongodb-master-2`：约 `371MiB`
- `rancher_huangfra`：约 `2.66GiB`
- `/Volumes/NVME1TB` 剩余约 `520GiB`
- Docker 镜像占用约 `14.89GB`

结论：Mac mini 可以再承载 `next-ai-drawio + doubao-proxy`。

### 1.3 K3s 中新的 PostgreSQL 架构现状

当前已经存在一套“主写 + 只读 + 两个 standby”的雏形：

- 写入口：
  - `pg-cluster/service/pg-primary`
  - 注释显示当前主库指向 `pg-replica1@100.127.141.83:5434`
- 只读入口：
  - `pg-cluster/service/pg-replica-ro`
- standby：
  - `pg-replica/statefulset/pg-standby-home`
  - `pg-replica/statefulset/pg-standby-office`
- exporter：
  - `postgres-exporter-*` 已在运行

注意点：

- `pg-primary` 和 `pg-replica-ro` 当前是通过 Service/VIP 抽象主写和只读入口。
- `pg-standby-home` 与 `pg-standby-office` 已经运行，但它们是否完全等价于你说的 `office-wsl / office2-wsl`，还需要和节点命名再做一次映射确认。
- 当前已有 `pgbouncer` 尝试部署在 `pg-replica` namespace，但失败了。

### 1.4 当前 pgbouncer 失败原因

现状：

- `deployment/pgbouncer` 存在
- `service/pgbouncer` 存在
- Pod 状态：`ImagePullBackOff`

直接原因：

- 使用了不存在的镜像标签：
  - `docker.io/edoburu/pgbouncer:latest`
  - `docker.io/bitnami/pgbouncer:latest`

额外问题：

- 当前 Deployment 里把数据库地址、用户名、密码直接写在环境变量里
- 还没有区分读写池
- 现在这层更像“试装”，不是可用生产入口

## 2. 核心判断

### 2.1 next-ai-drawio 迁移是否依赖 PostgreSQL

不依赖。

`next-ai-drawio` 当前不使用 PostgreSQL。它依赖的是：

- Web 前端服务本体
- `doubao-proxy`
- Secret 中的模型/API 配置

因此：

- 可以先迁 `next-ai-drawio`
- 不需要等 PG/pgbouncer 全部稳定后再迁

### 2.2 pgbouncer 是否适合做“读写分离中间件”

适合做连接池和入口抽象，不适合做真正的 SQL 级自动读写分离。

推荐理解为：

- `pgbouncer-rw` 连接 `pg-primary`
- `pgbouncer-ro` 连接 `pg-replica-ro`

应用按用途选择：

- 写请求走 `rw`
- 读请求走 `ro`

如果你想要“应用只连一个地址，由中间件自动识别 SELECT/INSERT 并拆流”，那更接近 `pgpool-II` 的能力，但复杂度和误判风险都高很多。

我的建议：

- 先不要上复杂的 SQL 自动拆分
- 先做“两个明确入口 + PgBouncer 连接池”

## 3. 推荐目标架构

### 3.1 PostgreSQL 访问层

建议在 K3s 里补一层 `pg-access`：

- `pgbouncer-rw`
  - 后端：`pg-cluster/pg-primary:5432`
  - 用途：事务写入、后台管理、元数据写入

- `pgbouncer-ro`
  - 后端：`pg-cluster/pg-replica-ro:5432`
  - 用途：查询、报表、只读页面

建议：

- 使用固定可用镜像，不要 `latest`
- 用户名/密码改成 `Secret`
- 副本数至少 `2`
- 加 `readinessProbe` / `livenessProbe`
- 可单独开放 ClusterIP，必要时再加 NodePort / Ingress TCP

### 3.2 Mac mini CMDB 平台

建议纳入：

- `gitea`
- `registry`
- `rancher`
- `next-ai-drawio`
- `doubao-proxy`

暂不要求：

- `next-ai-drawio` 接 PostgreSQL
- `next-ai-drawio` 接 Zitadel

### 3.3 图纸与元数据分层

- 图纸文件：
  - 放 Gitea 仓库
  - 例如 `architecture-diagrams`

- 图纸元数据：
  - 放 PostgreSQL
  - 后续由 CMDB 应用维护

## 4. 迁移顺序建议

### 阶段 A：先迁 next-ai-drawio

目标：

- 在 Mac mini Docker 中跑起来
- 连通 `doubao-proxy`
- 可正常打开、生成、导出图纸

做法：

- 一起迁 `next-ai-drawio + doubao-proxy`
- `doubao-proxy` 只暴露内部网络
- `next-ai-drawio` 暴露新端口，例如 `13010`
- Secret 改成 `.env` 或 Docker secrets 管理

### 阶段 B：整理 PG 访问层

目标：

- 建立统一的读写入口

做法：

- 修复失败的 `pgbouncer`
- 改成双入口：
  - `pgbouncer-rw -> pg-primary`
  - `pgbouncer-ro -> pg-replica-ro`

### 阶段 C：CMDB 元数据接入 PostgreSQL

目标：

- 图纸、系统、服务、数据库、网关、环境之间建立关联

做法：

- CMDB 应用写入 PostgreSQL
- 图纸文件继续在 Gitea 中版本化保存

## 5. 本轮建议结论

### 现在可以立刻做的

- 迁 `next-ai-drawio + doubao-proxy` 到 Mac mini

### 不建议现在阻塞迁移的

- 等 PG 全部重构完再迁 drawio

### 现在应该同步修的

- K3s 中 `pgbouncer` 的镜像和配置

### 对读写分离的建议

- 先做“双 PgBouncer 入口”
- 不先做复杂 SQL 自动分流

## 6. 下一步执行建议

建议紧接着做这两件事：

1. 先为 Mac mini 生成 `next-ai-drawio + doubao-proxy` 的 `docker-compose` 迁移草案
2. 再为 K3s 生成一版可落地的 `pgbouncer-rw / pgbouncer-ro` YAML

