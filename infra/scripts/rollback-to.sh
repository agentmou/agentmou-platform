#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Agentmou Stack — Rollback
# ---------------------------------------------------------------------------
# Revert the VPS to a previous commit SHA and rerun the canonical deploy.
# Optionally restore the pre-deploy Postgres snapshot that deploy-prod.sh
# took before that commit was applied.
#
# Usage:
#   bash infra/scripts/rollback-to.sh <commit-sha>
#
# Env toggles:
#   RESTORE_DB=1                  — restore the matching pre-deploy snapshot
#   PRE_DEPLOY_BACKUP_DIR=<path>  — override snapshot directory
#                                   (default: /var/backups/agentmou/pre-deploy)
#
# Conventions:
#   - Snapshots are named ${TS}_${SHORT_SHA}.sql.gz and were written by
#     deploy-prod.sh step 3. The short SHA corresponds to the commit the
#     VPS was BEFORE that deploy — i.e. rolling back to SHA X and restoring
#     the snapshot tagged X returns the VPS to the exact pre-X state.
# ---------------------------------------------------------------------------

if [ $# -lt 1 ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
Usage:
  bash infra/scripts/rollback-to.sh <commit-sha>

  RESTORE_DB=1 bash infra/scripts/rollback-to.sh <commit-sha>
    Also restore the matching pre-deploy pg_dumpall snapshot.
EOF
  exit 1
fi

TARGET_SHA="$1"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/infra/compose/.env"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
PRE_DEPLOY_DIR="${PRE_DEPLOY_BACKUP_DIR:-/var/backups/agentmou/pre-deploy}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}WARN: $1${NC}"; }
fail() { echo -e "${RED}ERROR: $1${NC}"; exit 1; }
ok()   { echo -e "${GREEN}OK: $1${NC}"; }

cd "$REPO_ROOT"

step "Fetching origin to resolve target SHA"
git fetch --all --quiet

if ! git rev-parse --verify "${TARGET_SHA}^{commit}" >/dev/null 2>&1; then
  fail "Commit ${TARGET_SHA} is not reachable in this checkout"
fi

RESOLVED_SHA=$(git rev-parse --short "$TARGET_SHA")
CURRENT_SHA=$(git rev-parse --short HEAD)

if [ "$RESOLVED_SHA" = "$CURRENT_SHA" ]; then
  warn "Already on ${RESOLVED_SHA}; nothing to rollback (the redeploy will still run)"
fi

step "Checking out ${RESOLVED_SHA} (was ${CURRENT_SHA})"
# Detached HEAD is intentional — a rollback pins the tree to a specific SHA.
git checkout --quiet "$RESOLVED_SHA"
ok "Checked out ${RESOLVED_SHA}"

if [ "${RESTORE_DB:-0}" = "1" ]; then
  step "Locating pre-deploy snapshot for ${RESOLVED_SHA}"
  SNAPSHOT=""
  if [ -d "$PRE_DEPLOY_DIR" ]; then
    SNAPSHOT=$(ls -t "${PRE_DEPLOY_DIR}"/*_"${RESOLVED_SHA}".sql.gz 2>/dev/null | head -1 || true)
  fi

  if [ -z "$SNAPSHOT" ]; then
    fail "No pre-deploy snapshot found for ${RESOLVED_SHA} in ${PRE_DEPLOY_DIR}. Re-run without RESTORE_DB=1 to skip the restore, or use a routine backup from /var/backups/agentmou/."
  fi

  warn "About to restore ${SNAPSHOT} — this will DROP and recreate the production database."
  read -r -p "Type the target SHA (${RESOLVED_SHA}) to confirm: " confirmation
  if [ "$confirmation" != "$RESOLVED_SHA" ]; then
    fail "Confirmation mismatch; aborting before touching the database"
  fi

  step "Restoring ${SNAPSHOT}"
  # Source env so we know the DB user/name for the psql invocation.
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  docker compose "${COMPOSE_ARGS[@]}" up -d postgres

  # Wait for postgres to be ready before piping into it
  for _ in $(seq 1 30); do
    if docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
        pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  gunzip -c "$SNAPSHOT" | docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
  ok "Database restored from ${SNAPSHOT}"
fi

step "Redeploying (idempotent)"
# Skip the pre-deploy snapshot during rollback: the current DB may already be
# the target state (either restored above, or we're rolling back without DB).
SKIP_PRE_DEPLOY_BACKUP=1 bash "$REPO_ROOT/infra/scripts/deploy-prod.sh"

echo
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN} Rollback to ${RESOLVED_SHA} completed${NC}"
echo -e "${GREEN}===============================================${NC}"
echo
echo "Reminder: HEAD is detached at ${RESOLVED_SHA}. If you want subsequent"
echo "main-tracking deploys to resume normally, run:"
echo "  git checkout main && git reset --hard ${RESOLVED_SHA} && git push --force-with-lease origin main"
echo "(only do the force-push if you have sign-off to move main backwards)."
