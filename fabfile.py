import os
from patchwork.transfers import rsync
from fabric import task


def _load_dotenv(path=".env"):
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
                val = val.strip().strip("\"'")
                os.environ.setdefault(key, val)
    except Exception:
        pass


_load_dotenv()


def _env(name, default):
    return os.environ.get(name) or default


DEPLOY_USER = _env("DEPLOY_USER", "REMOVED_DEPLOY_USER")
DEPLOY_HOST = _env("DEPLOY_HOST", "REMOVED_DEPLOY_HOST")
DEPLOY_ROOT = _env("DEPLOY_ROOT", "REMOVED_DEPLOY_ROOT")

hosts = [f"{DEPLOY_USER}@{DEPLOY_HOST}"]

ENVIRONMENTS = ("staging", "prod")
DEPLOY_HISTORY_DIR = f"{DEPLOY_ROOT}/deploy-history"


def deploy_dir(environment):
    return f"{DEPLOY_ROOT}/{environment}"


def compose_project(environment):
    return f"cashtokens-studio-{environment}"


def _require_deploy_root():
    if DEPLOY_ROOT == "REMOVED_DEPLOY_ROOT":
        raise Exception(
            "DEPLOY_ROOT is not set. Define DEPLOY_ROOT, DEPLOY_USER and DEPLOY_HOST "
            "in .env at the repo root, e.g. DEPLOY_ROOT=/srv/app"
        )


def _require_environment(environment):
    if environment not in ENVIRONMENTS:
        raise Exception(
            f"Invalid environment '{environment}'. Use one of: {', '.join(ENVIRONMENTS)}"
        )


def env_settings(environment):
    _require_environment(environment)
    prefix = environment.upper()
    return {
        "image": _env(f"{prefix}_IMAGE", f"cashtokens-studio-{environment}-web:latest"),
        "snapshot": _env(f"{prefix}_SNAPSHOT", f"cashtokens-studio-{environment}"),
        "keep": int(_env(f"{prefix}_KEEP", "2")),
        "compose_file": f"deployment/{environment}.yml",
        "deploy_dir": deploy_dir(environment),
        "history": f"{DEPLOY_HISTORY_DIR}/{environment}.log",
        "deploy_script": f"{deploy_dir(environment)}/scripts/{environment}-deploy.sh",
        "deploy_log": f"{DEPLOY_HISTORY_DIR}/{environment}-deploy.log",
    }


def _confirm(environment, action, confirm_first=True):
    if not confirm_first:
        return True
    if environment == "prod":
        return input(f"Are you sure you want to {action} PRODUCTION (yes-to-prod/no)?") == "yes-to-prod"
    return input(f"Are you sure you want to {action} STAGING (yes/no)?").lower() == "yes"


def _snapshots(c, environment):
    snapshot = env_settings(environment)["snapshot"]
    out = c.run(
        f"sudo docker images {snapshot} --format '{{{{.Tag}}}}' | sort -r",
        hide=True,
        warn=True,
    ).stdout
    return [tag for tag in out.split() if tag and tag != "<none>"]


def _snapshot_image(c, environment):
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
    settings = env_settings(environment)
    c.run("sudo docker image prune -f", warn=True)
    stale = _snapshots(c, environment)[settings["keep"]:]
    if stale:
        refs = " ".join(f"{settings['snapshot']}:{tag}" for tag in stale)
        c.run(f"sudo docker rmi {refs}", warn=True)
        print(f"Removed {len(stale)} old snapshot(s): {', '.join(stale)}")
    c.run("sudo docker builder prune -f", warn=True)


def attach_ssh_key(c):
    key_path = os.environ.get("SSH_KEY_PATH", "~/.ssh/id_rsa")
    key_path = os.path.expanduser(key_path)
    c.connect_kwargs.key_filename = key_path


@task(hosts=hosts)
def test_uname(c):
    """Check connectivity to the deploy host."""
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
        c.run(f"cp deployment/.env.{environment} .env.{environment}")
        c.run(
            f"sudo docker compose -p {compose_project(environment)} -f {settings['compose_file']} build"
        )
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
    """Host-wide prune; removes every unused image including snapshots."""
    attach_ssh_key(c)
    c.run("docker system prune --all -f")


@task(hosts=hosts)
def prune_env(c, environment):
    """Reclaim one environment's build leftovers, keeping the running image."""
    attach_ssh_key(c)
    _require_deploy_root()
    _prune_environment(c, environment)


@task(hosts=hosts)
def prune_staging(c):
    """Alias for `fab prune-env staging`."""
    prune_env(c, "staging")


@task(hosts=hosts)
def rollback(c, environment, tag=None):
    """Roll an environment's container back to a previous image snapshot."""
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


@task(hosts=hosts)
def rollback_staging(c, tag=None):
    """Alias for `fab rollback staging`."""
    rollback(c, "staging", tag)


@task(hosts=hosts)
def snapshots(c, environment):
    """List an environment's image snapshots, newest first."""
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
    """sync -> build (with snapshot) -> up -> env-scoped prune."""
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
    """Sync, then let the server finish the deploy as a detached job."""
    attach_ssh_key(c)
    _require_deploy_root()
    _require_environment(environment)
    settings = env_settings(environment)

    if not _confirm(environment, "deploy to", True):
        print("Not deployed")
        return

    sync(c, environment, False)

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
    print(f"  pid:       {launched.stdout.strip()}")
    print(f"  log:       {settings['deploy_log']}")
    print(f"  watch:     ssh {DEPLOY_USER}@<deploy-host> 'tail -f {settings['deploy_log']}'")
    print(f"  tail:      ssh {DEPLOY_USER}@<deploy-host> 'tail -n 5 {settings['deploy_log']}'")
    print(f"  snapshots: fab snapshots {environment}")
    print(f"  rollback:  fab rollback {environment}        (once it has finished)")
    print()
