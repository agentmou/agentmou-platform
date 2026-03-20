#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "WARN: infra/scripts/deploy-phase25.sh is deprecated. Use infra/scripts/deploy-prod.sh instead." >&2
exec bash "$REPO_ROOT/infra/scripts/deploy-prod.sh" "$@"
