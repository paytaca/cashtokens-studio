#!/usr/bin/env bash
#
# Server-side staging deploy for cashtokens-studio.
# Launched detached via `fab deploy-detached staging`; configuration is injected
# through environment variables, so this file carries no deploy settings.
#
# Ordering is deliberate: the build runs before the container is swapped, so a
# failed build never takes the running staging site offline. The swap itself is
# `compose up -d` (no explicit `down`/`rm`): the old container keeps serving until
# the new image is ready, then compose recreates it.
#
set -euo pipefail

# --- configuration -----------------------------------------------------------
# Configuration is injected by the deploy entrypoint through environment variables.
DEPLOY_DIR="${DEPLOY_DIR:?launch via 'fab deploy-detached staging'}"
HISTORY="${HISTORY:?launch via 'fab deploy-detached staging'}"
PROJECT="${PROJECT:?launch via 'fab deploy-detached staging'}"
COMPOSE_FILE="${COMPOSE_FILE:?launch via 'fab deploy-detached staging'}"
IMAGE="${IMAGE:-${PROJECT}-web:latest}"      # compose auto-name: <project>-<service>
SNAPSHOT="${SNAPSHOT:-$PROJECT}"             # snapshot tag namespace
SNAPSHOT_KEEP="${SNAPSHOT_KEEP:-2}"          # running image + 1 rollback target

cd "$DEPLOY_DIR"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

# Guard against ever running this from the wrong tree: the build context, the
# compose file and the snapshot history all assume the staging deploy dir.
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found in $PWD - wrong deploy directory, aborting" >&2
  exit 1
fi

# Run docker directly when elevated, otherwise via sudo (deploy host dependent).
docker_cmd() {
  if [ "$(id -u)" -eq 0 ]; then docker "$@"; else sudo docker "$@"; fi
}

log "staging deploy starting in $PWD"

# 1. Build-time env read by the Dockerfile from the build context.
cp deployment/.env.dev .env.dev

log "building $IMAGE"
docker_cmd compose -p "$PROJECT" -f "$COMPOSE_FILE" build

# 2. Snapshot the freshly built image so `fab rollback staging` can re-point
#    :latest at it without a rebuild (mirrors _snapshot_image).
if docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  tag="$(date -u +%Y%m%d-%H%M%S)"
  docker_cmd tag "$IMAGE" "$SNAPSHOT:$tag"
  mkdir -p "$(dirname "$HISTORY")"
  echo "$tag" >>"$HISTORY"
  log "snapshot $SNAPSHOT:$tag"
fi

# 3. Swap the container. No explicit `down`: the old container keeps serving until
#    compose replaces it with the freshly built image.
log "recreating container"
docker_cmd compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d

# 4. Reclaim disk: untagged leftovers, snapshots past the retention window, and
#    the build cache (the largest consumer on this host).
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

log "staging deploy complete - $IMAGE is live"
