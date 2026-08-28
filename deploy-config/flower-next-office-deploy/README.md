# flower-next-office-deploy

Pipeline: Gitea push → Jenkins controller (Mac Mini) → Office (build) → Mac Mini registry (push) → k3s (deploy).

## Components

| File | Where | What |
|------|-------|------|
| `office_build.sh` | dell@office:~/bin/flower-next-office-build.sh | git fetch + docker build + docker push |
| `kube_deploy.sh` | huangfra-ubun-master@100.96.54.109:~/bin/flower-next-kube-deploy.sh | kubectl set image + rollout + smoke |
| `jenkins_build_script.sh` | embedded in Jenkins job `flower-next-office-deploy` | orchestrates SSH calls to office + master |
| `jenkins_config.xml` | Jenkins job config | POST to /job/flower-next-office-deploy/config.xml |

## Jenkins Job

- URL: http://100.76.15.64:8082/job/flower-next-office-deploy/
- Build token: `flower-next-deploy-c1ub-2026`
- Parameter: `GIT_REF` (default `main`)
- Trigger: Gitea webhook on cmdb-gitea (http://100.76.15.64:13000 → admin/2026NewHorticultureEcommerce) push events to main

## Trust setup (one-time)

- Office (dell@100.113.60.71) `~/.ssh/authorized_keys` has the Jenkins cmdb-jenkins container's `id_ed25519.pub` (`jenkins@rpi8`)
- ubuntu-master already trusts cmdb-jenkins via the existing `new-ecommerce-k3s` job

## Image tag scheme

- `100.76.15.64:5001/flower-next:<8-char-short-sha>` (immutable per build)
- `100.76.15.64:5001/flower-next:latest` (always points to most recent build)

## k3s deployment

- Deployment: `flower-next` in namespace `new-ecommerce`
- Old behavior: image build happened on ubuntu-master via Dockerfile.la (LA/intl) + Dockerfile (CN)
- New: image build on Office, push to Mac Mini registry, deploy to k3s

## Office Docker mirror config (2026-08-28)

Office's /etc/docker/daemon.json has Chinese Docker Hub mirrors:
- `https://docker.m.daocloud.io`
- `https://hub-mirror.c.163.com`
- `https://mirror.baidubce.com`

Required because Office is in China and Docker Hub is blocked.
