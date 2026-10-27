#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:?launch via 'fab deploy-detached prod'}"
HISTORY="${HISTORY:?launch via 'fab deploy-detached prod'}"
PROJECT="${PROJECT:?launch via 'fab deploy-detached prod'}"
COMPOSE_FILE="${COMPOSE_FILE:?launch via 'fab deploy-detached prod'}"
IMAGE="${IMAGE:-${PROJECT}-web:latest}"
SNAPSHOT="${SNAPSHOT:-$PROJECT}"
SNAPSHOT_KEEP="${SNAPSHOT_KEEP:-2}"

cd "$DEPLOY_DIR"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found in $PWD - wrong deploy directory, aborting" >&2
  exit 1
fi

docker_cmd() {
  if [ "$(id -u)" -eq 0 ]; then docker "$@"; else sudo docker "$@"; fi
}

log "prod deploy starting in $PWD"

cp deployment/.env.prod .env.prod

log "building $IMAGE"
docker_cmd compose -p "$PROJECT" -f "$COMPOSE_FILE" build

if docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  tag="$(date -u +%Y%m%d-%H%M%S)"
  docker_cmd tag "$IMAGE" "$SNAPSHOT:$tag"
  mkdir -p "$(dirname "$HISTORY")"
  echo "$tag" >>"$HISTORY"
  log "snapshot $SNAPSHOT:$tag"
fi

log "recreating container"
docker_cmd compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d

log "pruning"
docker_cmd image prune -f
mapfile -t tags < <(docker_cmd images "$SNAPSHOT" --format '{{.Tag}}' | grep -v '<none>' | sort -r || true)
if [ "${#tags[@]}" -gt "$SNAPSHOT_KEEP" ]; then
  for stale in "${tags[@]:$SNAPSHOT_KEEP}"; do
    docker_cmd rmi "$SNAPSHOT:$stale" || true
  done
fi
docker_cmd builder prune -f

log "container status:"
docker_cmd compose -p "$PROJECT" -f "$COMPOSE_FILE" ps

log "prod deploy complete - $IMAGE is live"
