#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# AgentMou — Verify Production Image Assets
# ---------------------------------------------------------------------------
# Builds the API and worker production images and asserts that repo-backed
# catalog/workflow assets are present inside the runner filesystem at /prod.
#
# Usage:
#   bash infra/scripts/verify-prod-image-assets.sh
#   API_IMAGE_TAG=agentmou-api:check WORKER_IMAGE_TAG=agentmou-worker:check \
#     bash infra/scripts/verify-prod-image-assets.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_IMAGE_TAG="${API_IMAGE_TAG:-agentmou-api:asset-check}"
WORKER_IMAGE_TAG="${WORKER_IMAGE_TAG:-agentmou-worker:asset-check}"
KEEP_IMAGES="${KEEP_IMAGES:-0}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  if [ "$KEEP_IMAGES" = "1" ]; then
    return
  fi

  docker image rm -f "$API_IMAGE_TAG" "$WORKER_IMAGE_TAG" >/dev/null 2>&1 || true
}

fail() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

build_image() {
  local tag="$1"
  local dockerfile="$2"

  docker build -f "$dockerfile" -t "$tag" "$REPO_ROOT" >/dev/null
}

assert_file() {
  local tag="$1"
  local file_path="$2"

  if docker run --rm --entrypoint sh "$tag" -c "test -f '$file_path'"; then
    ok "$tag includes $file_path"
    return
  fi

  fail "$tag is missing $file_path"
}

if ! command -v docker >/dev/null 2>&1; then
  fail "docker is required"
fi

trap cleanup EXIT

echo "Building API runner image..."
build_image "$API_IMAGE_TAG" "$REPO_ROOT/services/api/Dockerfile"
assert_file "$API_IMAGE_TAG" "/prod/catalog/agents/inbox-triage/manifest.yaml"
assert_file "$API_IMAGE_TAG" "/prod/workflows/public/wf-01-auto-label-gmail/manifest.yaml"
assert_file "$API_IMAGE_TAG" "/prod/workflows/public/wf-01-auto-label-gmail/workflow.json"

echo ""
echo "Building worker runner image..."
build_image "$WORKER_IMAGE_TAG" "$REPO_ROOT/services/worker/Dockerfile"
assert_file "$WORKER_IMAGE_TAG" "/prod/catalog/agents/inbox-triage/manifest.yaml"
assert_file "$WORKER_IMAGE_TAG" "/prod/workflows/public/wf-01-auto-label-gmail/manifest.yaml"
assert_file "$WORKER_IMAGE_TAG" "/prod/workflows/public/wf-01-auto-label-gmail/workflow.json"

echo ""
ok "Production images include the required catalog and workflow assets"
