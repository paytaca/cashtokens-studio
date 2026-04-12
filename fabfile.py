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

# Read deploy user/host from environment (or fallback to previous defaults)
DEPLOY_USER = os.environ.get("DEPLOY_USER", "root")
DEPLOY_HOST = os.environ.get("DEPLOY_HOST", "REMOVED_DEPLOY_HOST")

# hosts needs to be a list available at import-time for fabric tasks
hosts = [f"{DEPLOY_USER}@{DEPLOY_HOST}"]


def attach_ssh_key(c):
    # allow overriding the ssh key path via SSH_KEY_PATH in .env
    key_path = os.environ.get("SSH_KEY_PATH", "~/.ssh/ct.pem")
    # expand ~ to the actual home directory
    key_path = os.path.expanduser(key_path)
    c.connect_kwargs.key_filename = key_path


@task(hosts=hosts)
def sync(c, environment, confirm_first=True):
    attach_ssh_key(c)
    c.run(f"mkdir -p /root/cashtokens-studio/{environment}")
    if not environment or environment not in ["staging", "prod"]:
        raise Exception("Invalid environment.")
    proceed = False
    if environment == "prod":
        if confirm_first:
            answer = input(
                "Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?"
            )
            if answer == "yes-to-prod":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == "staging":
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == "yes":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True
    if proceed == True:
        print(f"Syncing to cashtokens-studio/{environment}")
        rsync(
            c,
            ".",
            f"/root/cashtokens-studio/{environment}",
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
            ],
        )


@task(hosts=hosts)
def build(c, environment, confirm_first=True):
    attach_ssh_key(c)

    if not environment or environment not in ["staging", "prod"]:
        raise Exception("Invalid environment.")
    proceed = False
    if environment == "prod":
        if confirm_first:
            answer = input(
                "Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?"
            )
            if answer == "yes-to-prod":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == "staging":
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == "yes":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f"Building cashtokens-studio/{environment}")
        with c.cd(f"/root/cashtokens-studio/{environment}"):
            # c.run('yarn --ignore-engines')
            if environment == "staging":
                c.run("cp deployment/.env.dev .env.dev")
                # c.run('yarn run devbuild -m ssr')
                c.run(
                    f"sudo docker compose -p cashtokens-studio-{environment} -f deployment/{environment}.yml build"
                )
            elif environment == "prod":
                c.run("cp deployment/.env.prod .env.prod")
                # c.run('quasar build -m ssr')
                c.run(
                    f"sudo docker compose  -p cashtokens-studio-{environment} -f deployment/{environment}.yml build"
                )


@task(hosts=hosts)
def up(c, environment, confirm_first=True):
    attach_ssh_key(c)
    if not environment or environment not in ["staging", "prod"]:
        raise Exception("Invalid environment.")
    proceed = False
    if environment == "prod":
        if confirm_first:
            answer = input(
                "Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?"
            )
            if answer == "yes-to-prod":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True
    if environment == "staging":
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == "yes":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f"Docker up {environment}")
        with c.cd(f"/root/cashtokens-studio/{environment}"):
            # if environment == 'staging':
            #     # lets just commit to this, staging was deployed with 'staging' project name,
            #     c.run(f'docker compose  -p cashtokens-studio-{environment} -f deployment/{environment}.yml build')
            # elif environment == 'prod':
            #     c.run(f'docker compose  -f deployment/{environment}.yml build')
            c.run(
                f"sudo docker compose -p cashtokens-studio-{environment} -f deployment/{environment}.yml up -d"
            )


@task(hosts=hosts)
def down(c, environment, confirm_first=True):
    attach_ssh_key(c)
    if not environment or environment not in ["staging", "prod"]:
        raise Exception("Invalid environment.")

    proceed = False

    if environment == "prod":
        if confirm_first:
            answer = input(
                "Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?"
            )
            if answer == "yes-to-prod":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == "staging":
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == "yes":
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f"Executing docker down to cashtokens-studio/{environment}")
        with c.cd(f"/root/cashtokens-studio/{environment}"):
            # if environment == 'staging':
            #     # lets just commit to this, staging was already deployed with 'staging' as project name,
            #     c.run(f'docker compose  -p cashtokens-studio-{environment} -f deployment/{environment}.yml build')
            # elif environment == 'prod':
            #     c.run(f'docker compose  -f deployment/{environment}.yml build')
            c.run(
                f"sudo docker compose -p cashtokens-studio-{environment} -f deployment/{environment}.yml rm --stop --force"
            )


@task(hosts=hosts)
def prune(c):
    attach_ssh_key(c)
    c.run("docker system prune --all -f")


@task(hosts=hosts)
def deploy(c, environment):
    attach_ssh_key(c)
    if not environment or environment not in ["staging", "prod"]:
        raise Exception("Invalid deployment environment.")
    if environment == "prod":
        answer = input(
            "Are you sure you wan't to deploy to PRODUCTION (yes-to-prod/no)?"
        )
        if answer == "yes-to-prod":
            sync(c, environment, False)
            build(c, environment, False)
            down(c, environment, False)
            up(c, environment, False)
            prune(c)
            print("Deployment of cashtokens-studio/prod done!!!")
        else:
            print("Not deployed. Type 'yes-to-prod' to deploy")

    if environment == "staging":
        answer = input("Are you sure you wan't to deploy to STAGING (yes/no)?")
        if answer.lower() == "yes":
            sync(c, environment, False)
            build(c, environment, False)
            down(c, environment, False)
            up(c, environment, False)
            prune(c)
            print("Deployment of cashtokens-studio/staging done!!!")
        else:
            print("Not deployed")
