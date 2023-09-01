import os
from patchwork.transfers import rsync
from fabric import task

hosts = [
    'ubuntu@ec2-54-151-168-185.ap-southeast-1.compute.amazonaws.com'
]

def attach_ssh_key(c):
    home_directory = os.environ['HOME']
    c.connect_kwargs.key_filename = f'{home_directory}/.ssh/ct.pem'

@task(hosts=hosts)
def sync(c,environment,confirm_first=True):
    attach_ssh_key(c)
    c.run(f'mkdir -p /home/ubuntu/cashtokens-studio/{environment}')
    if not environment or environment not in ['staging', 'prod']:
        raise Exception('Invalid environment.')
    proceed = False
    if environment == 'prod':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?")
            if answer == 'yes-to-prod':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == 'staging':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == 'yes':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True
    if proceed == True:
        print(f'Syncing to cashtokens-studio/{environment}')
        rsync(
            c,
            '.',
            f'/home/ubuntu/cashtokens-studio/{environment}',
            exclude=[
                '.venv',
                '.git',
                '.DS_Store',
                '.env',
                '__pycache__',
                '*.pyc',
                '*.log',
                '*.pid',
                'node_modules'
            ]
        )


@task(hosts=hosts)
def build(c,environment,confirm_first=True):
    attach_ssh_key(c)

    if not environment or environment not in ['staging', 'prod']:
        raise Exception('Invalid environment.')
    proceed = False
    if environment == 'prod':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?")
            if answer == 'yes-to-prod':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == 'staging':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == 'yes':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f'Building cashtokens-studio/{environment}')
        with c.cd(f'/home/ubuntu/cashtokens-studio/{environment}'):
            c.run('yarn --ignore-engines')
            if environment == 'staging':
                c.run('cp deployment/.env.dev .env.dev')
                c.run('yarn run devbuild -m ssr')
                c.run(f'docker-compose -p cashtokens-studio-{environment} -f deployment/{environment}.yml build')
            elif environment == 'prod':
                c.run('cp deployment/.env.prod .env.prod')
                c.run('quasar build -m ssr')
                c.run(f'docker-compose  -f deployment/{environment}.yml build')


@task(hosts=hosts)
def up(c,environment,confirm_first=True):
    attach_ssh_key(c)
    if not environment or environment not in ['staging', 'prod']:
        raise Exception('Invalid environment.')
    proceed = False
    if environment == 'prod':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?")
            if answer == 'yes-to-prod':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True
    if environment == 'staging':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == 'yes':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f'Docker up {environment}')
        with c.cd(f'/home/ubuntu/cashtokens-studio/{environment}'):
            if environment == 'staging':
                # lets just commit to this, staging was deployed with 'staging' project name,
                c.run(f'docker-compose  -p cashtokens-studio-{environment} -f deployment/{environment}.yml build')
            elif environment == 'prod':
                c.run(f'docker-compose  -f deployment/{environment}.yml build')
            # c.run(f'docker-compose  -f deployment/{environment}.yml up -d')


@task(hosts=hosts)
def down(c,environment,confirm_first=True):
    attach_ssh_key(c)
    if not environment or environment not in ['staging', 'prod']:
        raise Exception('Invalid environment.')

    proceed = False

    if environment == 'prod':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to PRODUCTION (yes-to-prod/no)?")
            if answer == 'yes-to-prod':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if environment == 'staging':
        if confirm_first:
            answer = input("Are you sure you wan't to sync to STAGING (yes/no)?")
            if answer == 'yes':
                proceed = True
            else:
                proceed = False
        else:
            proceed = True

    if proceed == True:
        print(f'Executing docker down to cashtokens-studio/{environment}')
        with c.cd(f'/home/ubuntu/cashtokens-studio/{environment}'):
            if environment == 'staging':
                # lets just commit to this, staging was already deployed with 'staging' as project name,
                c.run(f'docker-compose  -p cashtokens-studio-{environment} -f deployment/{environment}.yml build')
            elif environment == 'prod':
                c.run(f'docker-compose  -f deployment/{environment}.yml build')
            # c.run(f'docker-compose  -f deployment/{environment}.yml rm --stop --force')

@task(hosts=hosts)
def deploy(c, environment):
    attach_ssh_key(c)
    if not environment or environment not in ['staging', 'prod']:
        raise Exception('Invalid deployment environment.')
    if environment == 'prod':
        answer = input("Are you sure you wan't to deploy to PRODUCTION (yes-to-prod/no)?")
        if answer == 'yes-to-prod':
            sync(c,environment, False)
            build(c,environment, False)
            down(c,environment, False)
            up(c,environment, False)
            print('Deployment of cashtokens-studio/prod done!!!')
        else:
            print("Not deployed. Type 'yes-to-prod' to deploy")


    if environment == 'staging':
        answer = input("Are you sure you wan't to deploy to STAGING (yes/no)?")
        if answer.lower() == 'yes':
            sync(c,environment,False)
            build(c,environment,False)
            down(c,environment,False)
            up(c,environment,False)
            print('Deployment of cashtokens-studio/staging done!!!')
        else:
            print('Not deployed')
