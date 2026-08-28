#!/bin/bash
# office_build.sh - build flower-next on Office and push to Mac Mini registry
set -euo pipefail

GIT_REF="${GIT_REF:-main}"
GITEA_URL="http://100.76.15.64:13000/admin/2026NewHorticultureEcommerce.git"
REGISTRY="100.76.15.64:5001"
WORKDIR="$HOME/2026NewHorticultureEcommerce"

echo "[office] WORKDIR=$WORKDIR"
echo "[office] GIT_REF=$GIT_REF"

# Clone or update
if [ ! -d "$WORKDIR/.git" ]; then
  echo "[office] cloning $GITEA_URL -> $WORKDIR"
  rm -rf "$WORKDIR"
  git clone "$GITEA_URL" "$WORKDIR"
fi

cd "$WORKDIR"
git fetch --all --prune
git checkout "$GIT_REF"
# If GIT_REF is a branch, reset to origin/GIT_REF
if git rev-parse --verify "origin/$GIT_REF" >/dev/null 2>&1; then
  git reset --hard "origin/$GIT_REF"
else
  git reset --hard "$GIT_REF"
fi

SHA="$(git rev-parse --short=8 HEAD)"
echo "[office] Building SHA=$SHA"

# Build flower-next image
docker build \
  --build-arg "CACHE_BUST=$SHA" \
  -t "$REGISTRY/flower-next:$SHA" \
  -t "$REGISTRY/flower-next:latest" \
  -f next-app/Dockerfile \
  next-app

# Push to Mac Mini registry
docker push "$REGISTRY/flower-next:$SHA"
docker push "$REGISTRY/flower-next:latest"

echo "$SHA"
