import os
from patchwork.transfers import rsync
from fabric import task


def _load_dotenv(path=".env"):
    """Minimal .env loader: set environment variables if not already present.

    We avoid adding a dependency on python-dotenv; this is intentionally small
    and only supports simple KEY=VALUE lines and comments.
    """
    try:
        if not os.path.exists(path):
            return
        with open(path, "r") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                # strip quotes and surrounding whitespace
                val = val.strip().strip("\"'")
                # don't overwrite existing env vars
                os.environ.setdefault(key, val)
    except Exception:
        # .env loading must not break the fabfile usage; fail silently
        pass


# Load .env from repo root so DEPLOY_USER / DEPLOY_HOST can be defined there.
_load_dotenv()


def _env(name, default):
    """Deploy settings come from .env; blank means 'not filled in', not 'use an empty value'."""
    return os.environ.get(name) or default


# Read deploy user/host from environment (or fallback to previous defaults)
DEPLOY_USER = _env("DEPLOY_USER", "root")
DEPLOY_HOST = _env("DEPLOY_HOST", "REMOVED_DEPLOY_HOST")

# Root of the deployment tree on the server, e.g. /srv/app. Every path below is derived
# from it so the repository carries no server layout: an environment lives in
# `{DEPLOY_ROOT}/{environment}`, and the deploy history sits beside them. The default is a placeholder
# that the tasks refuse to use, so a forgotten .env fails loudly instead of deploying into the wrong tree.
DEPLOY_ROOT = _env("DEPLOY_ROOT", "REMOVED_DEPLOY_ROOT")

# hosts needs to be a list available at import-time for fabric tasks
hosts = [f"{DEPLOY_USER}@{DEPLOY_HOST}"]

ENVIRONMENTS = ("staging", "prod")

# Deploy history sits outside the rsynced tree, next to the environment directories.
DEPLOY_HISTORY_DIR = f"{DEPLOY_ROOT}/deploy-history"


def deploy_dir(environment):
    """Deployment tree of an environment, derived from DEPLOY_ROOT."""
    return f"{DEPLOY_ROOT}/{environment}"


def compose_project(environment):
    """Compose project name, which also names the image and container (<project>-<service>)."""
    return f"cashtokens-studio-{environment}"


def _require_deploy_root():
    """Fail before anything is created: a placeholder root would deploy into the wrong tree."""
    if DEPLOY_ROOT == "REMOVED_DEPLOY_ROOT":
        raise Exception(
            "DEPLOY_ROOT is not set. Define it in .env at the repo root, "
            "e.g. DEPLOY_ROOT=/srv/app"
        )


def _require_environment(environment):
    if environment not in ENVIRONMENTS:
        raise Exception(
            f"Invalid environment '{environment}'. Use one of: {', '.join(ENVIRONMENTS)}"
        )


def env_settings(environment):
    """Everything that differs between the two deployments, derived from the environment name.

    Per-environment overrides live in .env (STAGING_IMAGE, PROD_KEEP, ...), so the
    defaults below work out of the box.
    """
    _require_environment(environment)
    prefix = environment.upper()
    return {
        # compose auto-names the image <project>-<service>
        "image": _env(f"{prefix}_IMAGE", f"cashtokens-studio-{environment}-web:latest"),
        # snapshot tag namespace for rollbacks
        "snapshot": _env(f"{prefix}_SNAPSHOT", f"cashtokens-studio-{environment}"),
        # running image plus N rollback targets
        "keep": int(_env(f"{prefix}_KEEP", "2")),
        "compose_file": f"deployment/{environment}.yml",
        "deploy_dir": deploy_dir(environment),
        "history": f"{DEPLOY_HISTORY_DIR}/{environment}.log",
        # server-side script, synced with the repository
        "deploy_script": f"{deploy_dir(environment)}/scripts/{environment}-deploy.sh",
        "deploy_log": f"{DEPLOY_HISTORY_DIR}/{environment}-deploy.log",
    }


def _confirm(environment, action, confirm_first=True):
    """Ask before touching an environment. Prod needs the explicit `yes-to-prod`."""
    if not confirm_first:
        return True
    if environment == "prod":
        return input(f"Are you sure you want to {action} PRODUCTION (yes-to-prod/no)?") == "yes-to-prod"
    return input(f"Are you sure you want to {action} STAGING (yes/no)?").lower() == "yes"


# --- image snapshots (both environments) ------------------------------------
# Every build is snapshotted under a timestamp tag, so a bad deploy can be rolled
# back by re-pointing the `:latest` tag and recreating the container: no re-sync
# and no rebuild. The app is baked into the image, so this restores build-time
# configuration too (VITE_* values, the baked PORT).
#
# The server is disk-tight, so retention keeps only the running image plus the
# configured number of rollback targets, sweeps untagged leftovers, and bounds
# the build cache.
def _snapshots(c, environment):
    """Snapshot tags for one environment, newest first. Tags are UTC `YYYYmmdd-HHMMSS` so they sort chronologically."""
    snapshot = env_settings(environment)["snapshot"]
    out = c.run(
        f"sudo docker images {snapshot} --format '{{{{.Tag}}}}' | sort -r",
        hide=True,
        warn=True,
    ).stdout
    return [tag for tag in out.split() if tag and tag != "<none>"]


def _snapshot_image(c, environment):
    """Tag the image that was just built and record it in the deploy history."""
    settings = env_settings(environment)
    if not c.run(f"sudo docker image inspect {settings['image']}", hide=True, warn=True).ok:
        print(f"WARNING: {settings['image']} not found — skipping snapshot")
        return None

    tag = c.run("date -u +%Y%m%d-%H%M%S", hide=True).stdout.strip()
    c.run(f"sudo docker tag {settings['image']} {settings['snapshot']}:{tag}")
    c.run(f"mkdir -p $(dirname {settings['history']})")
    c.run(f"echo '{tag}' >> {settings['history']}")
    print(f"Snapshot: {settings['snapshot']}:{tag}")
    return tag


def _prune_environment(c, environment):
    """Reclaim one environment's build leftovers without ever touching the running image.

    Keeps the running image plus `keep` snapshots, drops untagged leftovers, and bounds
    the build cache (the biggest consumer on this host). Host-wide pruning is the manual
    `prune` task, which is destructive on purpose.
    """
    settings = env_settings(environment)

    # 1. untagged (<none>) leftovers — they appear whenever :latest moves
    c.run("sudo docker image prune -f", warn=True)

    # 2. drop everything beyond the newest `keep` snapshots
    stale = _snapshots(c, environment)[settings["keep"]:]
    if stale:
        refs = " ".join(f"{settings['snapshot']}:{tag}" for tag in stale)
        # no -f: never remove an image a container is still using
        c.run(f"sudo docker rmi {refs}", warn=True)
        print(f"Removed {len(stale)} old snapshot(s): {', '.join(stale)}")

    # 3. build cache — not an image, and usually the largest thing on disk here
    c.run("sudo docker builder prune -f", warn=True)


def attach_ssh_key(c):
    # allow overriding the ssh key path via SSH_KEY_PATH in .env
    # default to standard OpenSSH private key path unless overridden
    key_path = os.environ.get("SSH_KEY_PATH", "~/.ssh/id_rsa")
    # expand ~ to the actual home directory
    key_path = os.path.expanduser(key_path)
    c.connect_kwargs.key_filename = key_path


@task(hosts=hosts)
def test_uname(c):
    """Quick connectivity check: run `uname -a` on the remote host.

    Use: fab test-uname
    """
    attach_ssh_key(c)
    print("Running uname -a on the deploy host...")
    result = c.run("uname -a", hide=False)
    print("Remote uname output:")
    print(result.stdout.strip())


@task(hosts=hosts)
def sync(c, environment, confirm_first=True):
    attach_ssh_key(c)
    _require_deploy_root()
    _require_environment(environment)
    if not _confirm(environment, "sync to", confirm_first):
        print("Not synced")
        return
    c.run(f"mkdir -p {deploy_dir(environment)}")
    print(f"Syncing to cashtokens-studio/{environment}")
    rsync(
        c,
        ".",
        deploy_dir(environment),
        exclude=[
            ".venv",
            ".git",
            ".DS_Store",
            ".env",
            "__pycache__",
            "*.pyc",
            "*.log",
            "*.pid",
            "node_modules",
            # Build output is produced inside the Docker build (and is already in
            # .dockerignore), so syncing it is pure waste.
            "dist",
            ".quasar",
        ],
    )


@task(hosts=hosts)
def build(c, environment, confirm_first=True):
    attach_ssh_key(c)
    _require_environment(environment)
    if not _confirm(environment, "build for", confirm_first):
        print("Not built")
        return

    settings = env_settings(environment)
    print(f"Building cashtokens-studio/{environment}")
    with c.cd(settings["deploy_dir"]):
        # Build-time env file: the Dockerfile reads it from the build context. The copy lands
        # on the same name quasar's build reads (`.env.dev` for staging via BUILD_ENV=dev,
        # `.env.prod` for the automatic production selection).
        c.run(f"cp deployment/.env.{environment} .env.{environment}")
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} build"
        )
        # Snapshot the image we are about to deploy so `rollback <env>` can
        # re-point :latest at it without a rebuild.
        _snapshot_image(c, environment)


@task(hosts=hosts)
def up(c, environment, confirm_first=True):
    attach_ssh_key(c)
    _require_environment(environment)
    if not _confirm(environment, "bring up", confirm_first):
        print("Not started")
        return

    settings = env_settings(environment)
    print(f"Docker up {environment}")
    with c.cd(settings["deploy_dir"]):
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} up -d"
        )


@task(hosts=hosts)
def down(c, environment, confirm_first=True):
    attach_ssh_key(c)
    _require_environment(environment)
    if not _confirm(environment, "take down", confirm_first):
        print("Not stopped")
        return

    settings = env_settings(environment)
    print(f"Executing docker down to cashtokens-studio/{environment}")
    with c.cd(settings["deploy_dir"]):
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} rm --stop --force"
        )


@task(hosts=hosts)
def prune(c):
    """DANGER: host-wide `docker system prune --all`.

    Removes every unused image on the server, including other apps' images and all
    snapshots. Deploys never call this; use `prune-env <environment>` for routine cleanup.

    Use: fab prune
    """
    attach_ssh_key(c)
    c.run("docker system prune --all -f")


@task(hosts=hosts)
def prune_env(c, environment):
    """Reclaim one environment's build leftovers, keeping the running image and its snapshots.

    Use: fab prune-env staging
         fab prune-env prod
    """
    attach_ssh_key(c)
    _require_deploy_root()
    _prune_environment(c, environment)


@task(hosts=hosts)
def prune_staging(c):
    """Alias for `fab prune-env staging`."""
    prune_env(c, "staging")


@task(hosts=hosts)
def rollback(c, environment, tag=None):
    """Roll an environment's container back to a previous image snapshot.

    No re-sync and no rebuild: re-points the `:latest` tag at the snapshot and
    recreates the container, so it takes seconds. Pass a specific snapshot tag,
    or omit it to use the newest one that isn't currently deployed.

    Use: fab rollback staging                       (previous staging build)
         fab rollback prod                          (previous prod build)
         fab rollback prod --tag=20261013-171500    (a specific snapshot)
    """
    attach_ssh_key(c)
    _require_deploy_root()
    settings = env_settings(environment)

    snapshots = _snapshots(c, environment)
    if not snapshots:
        raise Exception(f"No {environment} snapshots found — nothing to roll back to.")

    if tag:
        if tag not in snapshots:
            raise Exception(f"Unknown snapshot '{tag}'. Available: {', '.join(snapshots)}")
        target = tag
    else:
        if len(snapshots) < 2:
            raise Exception(
                "Only one snapshot exists, so there is no previous build to roll back to "
                f"({settings['snapshot']}:{snapshots[0]} is the running image)."
            )
        target = snapshots[1]

    required = "yes-to-prod" if environment == "prod" else "yes"
    answer = input(f"Roll {environment} back to {settings['snapshot']}:{target}? ({required})")
    if answer.strip() != required:
        print("Not rolled back")
        return

    c.run(f"sudo docker tag {settings['snapshot']}:{target} {settings['image']}")
    with c.cd(settings["deploy_dir"]):
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} "
            "up -d --no-build --force-recreate"
        )

    print(f"Rolled {environment} back to {settings['snapshot']}:{target}")
    print("Equivalent one-liner, if fabric isn't around:")
    print(f"  sudo docker tag {settings['snapshot']}:{target} {settings['image']}")
    print(
        f"  cd {settings['deploy_dir']} && sudo docker compose -p {compose_project(environment)} "
        f"-f {settings['compose_file']} up -d --no-build --force-recreate"
    )


@task(hosts=hosts)
def rollback_staging(c, tag=None):
    """Alias for `fab rollback staging`."""
    rollback(c, "staging", tag)


@task(hosts=hosts)
def snapshots(c, environment):
    """List an environment's image snapshots, newest first.

    Use: fab snapshots staging
         fab snapshots prod
    """
    attach_ssh_key(c)
    snapshot = env_settings(environment)["snapshot"]
    for tag in _snapshots(c, environment):
        print(f"{snapshot}:{tag}")


@task(hosts=hosts)
def staging_snapshots(c):
    """Alias for `fab snapshots staging`."""
    snapshots(c, "staging")


@task(hosts=hosts)
def deploy(c, environment):
    """sync -> build (with snapshot) -> up -d -> env-scoped prune.

    The container swap happens only after the new image is built, so the running
    site keeps serving the previous image until compose recreates it. There is no
    explicit `down`; that is what used to open a downtime window.

    Use: fab deploy staging
         fab deploy prod
    """
    attach_ssh_key(c)
    _require_deploy_root()
    _require_environment(environment)
    settings = env_settings(environment)

    if not _confirm(environment, "deploy to", True):
        print("Not deployed")
        return

    sync(c, environment, False)
    build(c, environment, False)

    print(f"Swapping the {environment} container onto the new image")
    with c.cd(settings["deploy_dir"]):
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} up -d"
        )

    # Environment-scoped cleanup: untagged leftovers, snapshots past the retention
    # window and the build cache. The host-wide `prune` stays manual on purpose.
    _prune_environment(c, environment)

    print(f"Deployment of cashtokens-studio/{environment} done!!!")
    current = _snapshots(c, environment)
    if len(current) > 1:
        print(
            f"Rollback if anything is wrong: fab rollback {environment}  "
            f"(back to {settings['snapshot']}:{current[1]})"
        )
    c.run("docker system df", hide=False, warn=True)


@task(hosts=hosts)
def deploy_detached(c, environment):
    """Sync, then let the server finish the deploy on its own.

    Only the rsync has to come from this laptop. Once that is done, the build,
    the container swap and the prune run as a detached server-side job
    (setsid + nohup, all fds redirected), so this session — and the laptop — can
    go away while the build runs.

    Each environment has its own server script: `scripts/<environment>-deploy.sh`.

    The argument is required (not defaulted) so this is invoked the same way as
    `deploy`; invoke 1.x otherwise treats a bare `staging` as a task name.

    Use: fab deploy-detached staging
         fab deploy-detached prod
         then: ssh <host> 'tail -f <the environment deploy log>'
    """
    attach_ssh_key(c)
    _require_deploy_root()
    _require_environment(environment)
    settings = env_settings(environment)

    if not _confirm(environment, "deploy to", True):
        print("Not deployed")
        return

    # 1. The sync is the only laptop-bound step, so it has to finish first.
    sync(c, environment, False)

    # 2. Hand the rest to the server, detached from this SSH session. The script carries no
    #    server layout of its own, so its configuration is passed in here, from the same
    #    .env-backed constants the fabric tasks use. Redirecting all three fds is what lets
    #    ssh return immediately instead of waiting on the background job.
    deploy_env = " ".join(
        [
            f"DEPLOY_DIR={settings['deploy_dir']}",
            f"HISTORY={settings['history']}",
            f"PROJECT={compose_project(environment)}",
            f"COMPOSE_FILE={settings['compose_file']}",
            f"IMAGE={settings['image']}",
            f"SNAPSHOT={settings['snapshot']}",
            f"SNAPSHOT_KEEP={settings['keep']}",
        ]
    )
    c.run(f"chmod +x {settings['deploy_script']}")
    c.run(f"mkdir -p {os.path.dirname(settings['deploy_log'])}")
    launched = c.run(
        f"{deploy_env} setsid nohup {settings['deploy_script']} "
        f"> {settings['deploy_log']} 2>&1 < /dev/null & echo $!",
        pty=False,
    )

    print()
    print("=" * 64)
    print("OK YOU CAN LEAVE")
    print("=" * 64)
    print("Sync finished and the build is running on the server, detached from")
    print("this session. You can close the laptop now.")
    print()
    print(f"  pid:       {launched.stdout.strip()}")
    print(f"  log:       {settings['deploy_log']}")
    print(f"  watch:     ssh {DEPLOY_USER}@<deploy-host> 'tail -f {settings['deploy_log']}'")
    print(f"  tail:      ssh {DEPLOY_USER}@<deploy-host> 'tail -n 5 {settings['deploy_log']}'")
    print(f"  snapshots: fab snapshots {environment}")
    print(f"  rollback:  fab rollback {environment}        (once it has finished)")
    print()
