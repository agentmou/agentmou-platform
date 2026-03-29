#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_DIR="/etc/agentmou"
ENV_FILE="$ENV_DIR/restic.env"
PASSWORD_FILE="$ENV_DIR/restic-password"
BACKUP_METADATA_DIR="$REPO_ROOT/infra/backups"
SERVICE_NAME="agentmou-backup-offsite.service"
TIMER_NAME="agentmou-backup-offsite.timer"
SYSTEMD_DIR="/etc/systemd/system"
ENABLE_TIMER=0

usage() {
  cat <<'EOF'
Usage:
  sudo bash infra/scripts/install-offsite-backup.sh [--enable]
EOF
}

fail() {
  printf '[install-offsite-backup] ERROR: %s\n' "$1" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "run this installer as root"
  fi
}

env_is_configured() {
  [ -f "$ENV_FILE" ] || return 1
  ! grep -Eq 'changeme|replace-me|example' "$ENV_FILE"
}

password_is_configured() {
  [ -s "$PASSWORD_FILE" ] || return 1
  ! grep -Eq 'changeme|replace-me|example' "$PASSWORD_FILE"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --enable)
      ENABLE_TIMER=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "unknown argument: $1"
      ;;
  esac
  shift
done

require_root

apt-get update
apt-get install -y restic

install -d -m 750 "$ENV_DIR"
install -d -m 750 /var/lock/agentmou
install -d -m 750 /var/cache/restic

if [ ! -f "$ENV_FILE" ]; then
  install -m 600 "$BACKUP_METADATA_DIR/restic.env.example" "$ENV_FILE"
  echo "Created $ENV_FILE from template. Fill in real restic credentials before enabling the timer."
fi

if [ ! -f "$PASSWORD_FILE" ]; then
  printf 'changeme-restic-password\n' > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
  echo "Created placeholder $PASSWORD_FILE. Replace it with the real restic password."
fi

install -m 644 "$BACKUP_METADATA_DIR/$SERVICE_NAME" "$SYSTEMD_DIR/$SERVICE_NAME"
install -m 644 "$BACKUP_METADATA_DIR/$TIMER_NAME" "$SYSTEMD_DIR/$TIMER_NAME"

systemctl daemon-reload

if [ "$ENABLE_TIMER" -eq 1 ]; then
  if env_is_configured && password_is_configured; then
    systemctl enable --now "$TIMER_NAME"
    echo "Enabled and started $TIMER_NAME"
  else
    echo "Timer not enabled because $ENV_FILE or $PASSWORD_FILE still contains placeholders."
  fi
else
  echo "Installed restic, backup metadata, and systemd units."
  echo "Next steps:"
  echo "  1. Edit $ENV_FILE"
  echo "  2. Replace $PASSWORD_FILE contents"
  echo "  3. Run a local backup: sudo bash $REPO_ROOT/infra/scripts/backup.sh"
  echo "  4. Run an offsite backup: sudo bash $REPO_ROOT/infra/scripts/backup-offsite.sh --mode=manual"
  echo "  5. Run a restore smoke test: sudo bash $REPO_ROOT/infra/scripts/restore-offsite-smoke.sh"
  echo "  6. Enable the timer: sudo systemctl enable --now $TIMER_NAME"
fi
