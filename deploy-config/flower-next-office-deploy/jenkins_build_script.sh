#!/bin/bash
# flower-next-office-deploy — Jenkins controller script
# Flow:
#   1. SSH to Office (100.113.60.71) → run ~/bin/flower-next-office-build.sh
#      (this clones/updates Gitea repo, builds flower-next image, pushes to 100.76.15.64:5001)
#   2. SSH to ubuntu-master (100.96.54.109) → run ~/bin/flower-next-kube-deploy.sh
#      (this does kubectl set image + rollout + smoke)
set -euo pipefail

GIT_REF="${GIT_REF:-main}"
OFFICE_HOST="dell@100.113.60.71"
MASTER_HOST="huangfra-ubun-master@100.96.54.109"
KUBE_NS="new-ecommerce"
DEPLOY="flower-next"
REGISTRY="100.76.15.64:5001"

echo "=================================================="
echo "flower-next-office-deploy"
echo "GIT_REF=$GIT_REF"
echo "=================================================="

#--------------------------------------------------------------------
# Step 1: Office builds + pushes image
#--------------------------------------------------------------------
echo
echo "======= [1/3] Office: build flower-next image + push to Mac Mini registry ======="
COMMIT_SHA=$(ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$OFFICE_HOST" \
  "GIT_REF='$GIT_REF' ~/bin/flower-next-office-build.sh")
# script ends with `echo $SHA`, so the SHA is on the LAST stdout line
COMMIT_SHA="$(echo "$COMMIT_SHA" | tail -n 1 | tr -d '[:space:]')"
echo "Built and pushed image with SHA: $COMMIT_SHA"
[ -n "$COMMIT_SHA" ] || { echo "FAIL: empty COMMIT_SHA"; exit 1; }

#--------------------------------------------------------------------
# Step 2: ubuntu-master kubectl deploy
#--------------------------------------------------------------------
echo
echo "======= [2/3] ubuntu-master: kubectl set image + rollout ======="
ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$MASTER_HOST" \
  "SHA='$COMMIT_SHA' ~/bin/flower-next-kube-deploy.sh"

#--------------------------------------------------------------------
# Step 3: smoke (re-check after deploy)
#--------------------------------------------------------------------
echo
echo "======= [3/3] smoke ======="
POD=$(ssh -o BatchMode=yes "$MASTER_HOST" \
  "kubectl -n $KUBE_NS get pod -l app=$DEPLOY --field-selector=status.phase=Running --no-headers -o custom-columns=NAME:.metadata.name | head -1 | tr -d '[:space:]'")
echo "Running pod: $POD"
[ -n "$POD" ] || { echo "FAIL: no running pod"; exit 1; }
echo "OK  k3s deployment $DEPLOY rolled out with image $REGISTRY/flower-next:$COMMIT_SHA"

echo
echo "======= DEPLOY SUCCESS: $COMMIT_SHA ======="
