#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Bootstrap a fresh Ubuntu host for the dedicated OpenClaw runtime VPS
# ---------------------------------------------------------------------------
# Run this once on a new Ubuntu VPS as root.
#
# What it does:
#   - installs git, curl, ufw, and Docker if needed
#   - enables Docker
#   - creates the deploy user if missing
#   - adds deploy to docker and sudo
#   - optionally installs a provided SSH public key for deploy
#   - prepares /srv/agentmou-platform
#   - enables UFW for 22, 80, and 443
#
# Usage:
#   sudo bash infra/scripts/bootstrap-openclaw-ubuntu-host.sh
#   DEPLOY_SSH_PUBLIC_KEY="$(cat ~/.ssh/id_ed25519.pub)" \
#     sudo bash infra/scripts/bootstrap-openclaw-ubuntu-host.sh
# ---------------------------------------------------------------------------

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_DIR="${REPO_DIR:-/srv/agentmou-platform}"
DEPLOY_SSH_PUBLIC_KEY="${DEPLOY_SSH_PUBLIC_KEY:-}"

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}WARN: $1${NC}"; }
fail() { echo -e "${RED}ERROR: $1${NC}"; exit 1; }
ok() { echo -e "${GREEN}OK: $1${NC}"; }

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "Run this script as root."
  fi
}

detect_ubuntu() {
  if [ ! -f /etc/os-release ]; then
    fail "Cannot detect the operating system."
  fi

  # shellcheck disable=SC1091
  . /etc/os-release
  if [ "${ID:-}" != "ubuntu" ]; then
    fail "This bootstrap script currently supports Ubuntu hosts only."
  fi
}

install_base_packages() {
  step "Installing base packages"
  apt-get update
  apt-get install -y ca-certificates curl git ufw sudo
  ok "Base packages installed"
}

install_docker_if_needed() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker and Docker Compose are already available"
    return
  fi

  step "Installing Docker"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  systemctl enable --now docker
  ok "Docker installed and enabled"
}

ensure_deploy_user() {
  step "Ensuring deploy user exists"
  if id "$DEPLOY_USER" >/dev/null 2>&1; then
    ok "User $DEPLOY_USER already exists"
  else
    useradd -m -s /bin/bash "$DEPLOY_USER"
    ok "User $DEPLOY_USER created"
  fi

  usermod -aG docker "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  ok "User $DEPLOY_USER added to docker and sudo groups"
}

install_deploy_ssh_key_if_provided() {
  if [ -z "$DEPLOY_SSH_PUBLIC_KEY" ]; then
    warn "No DEPLOY_SSH_PUBLIC_KEY provided; install your SSH key for $DEPLOY_USER manually before logging out."
    return
  fi

  step "Installing SSH public key for $DEPLOY_USER"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  printf '%s\n' "$DEPLOY_SSH_PUBLIC_KEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  ok "SSH public key installed for $DEPLOY_USER"
}

prepare_repo_directory() {
  step "Preparing repository directory"
  install -d -m 755 /srv
  install -d -m 755 "$(dirname "$REPO_DIR")"
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 755 "$REPO_DIR"
  ok "Repository directory prepared at $REPO_DIR"
}

configure_firewall() {
  step "Configuring UFW"
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status verbose
  ok "Firewall rules applied"
}

require_root
detect_ubuntu
install_base_packages
install_docker_if_needed
ensure_deploy_user
install_deploy_ssh_key_if_provided
prepare_repo_directory
configure_firewall

echo
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN} OpenClaw host bootstrap completed successfully${NC}"
echo -e "${GREEN}===============================================${NC}"
echo
echo "Next steps:"
echo "  1. ssh ${DEPLOY_USER}@<openclaw-vps-ip>"
echo "  2. cd /srv && git clone <repo-url> agentmou-platform"
echo "  3. cd $REPO_DIR"
echo "  4. cp infra/compose/.env.openclaw.example infra/compose/.env.openclaw"
echo "  5. edit infra/compose/.env.openclaw with real values"
echo "  6. bash infra/scripts/deploy-openclaw.sh"
