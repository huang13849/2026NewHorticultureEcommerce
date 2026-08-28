#!/bin/bash
# kube_deploy.sh - update flower-next k3s deployment on ubuntu-master
set -euo pipefail

KUBE_NS="new-ecommerce"
DEPLOY="flower-next"
REGISTRY="100.76.15.64:5001"
SHA="${SHA:?SHA not set}"
export KUBECONFIG="${KUBECONFIG:-$HOME/k3s.yaml}"

echo "[k3s] NS=$KUBE_NS DEP=$DEPLOY SHA=$SHA"
echo "[k3s] image before:"
kubectl -n "$KUBE_NS" get deploy "$DEPLOY" -o jsonpath='{.spec.template.spec.containers[0].image}'
echo
echo "[k3s] rolling update:"
kubectl -n "$KUBE_NS" set image "deployment/$DEPLOY" "$DEPLOY=$REGISTRY/flower-next:$SHA"
kubectl -n "$KUBE_NS" delete pod -l "app=$DEPLOY" --ignore-not-found
echo "[k3s] waiting for rollout:"
kubectl -n "$KUBE_NS" rollout status "deployment/$DEPLOY" --timeout=300s
