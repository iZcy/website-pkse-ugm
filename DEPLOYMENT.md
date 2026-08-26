# Deployment

## Versioning contract

| Trigger | Images built | Deployed to |
|---|---|---|
| `git tag v1.4.0-rc1 && git push --tags` | `:v1.4.0-rc1` + `:dev` | **dev** |
| GitHub Release published | `:v1.4.0` + `:latest` | **prod** |

Both are built by `.github/workflows/release.yml` and pushed to GHCR as
`ghcr.io/izcy/website-pkse-ugm/api` and `.../web`. Nothing is compiled on the
server any more — that is what stops the Docker cache from filling the disk.

## Required GitHub secrets

`DEPLOY_HOST` `DEPLOY_USER` `DEPLOY_KEY` (deploy SSH private key), `GHCR_TOKEN`
(PAT with `read:packages`, used by the host to pull). Define `dev` and `prod`
environments in repo settings so releases can require approval.

## Manual deploy

    ssh pkse
    cd ~/webapp
    IMAGE_TAG=v1.4.0 docker compose -f docker-compose.prod.yml pull
    IMAGE_TAG=v1.4.0 docker compose -f docker-compose.prod.yml up -d

## Backups

`scripts/backup.sh`, run nightly at 02:30 by `pkse-backup.timer`. Keeps 14 days
in `~/backups`, aborts if the root filesystem is ≥90% full, and refuses to
rotate when a dump comes back empty.

    sudo cp scripts/pkse-backup.{service,timer} /etc/systemd/system/
    sudo systemctl enable --now pkse-backup.timer

Restore:

    gzip -dc backups/<stamp>/webapp-db.archive.gz \
      | docker exec -i webapp-mongo-1 mongorestore --archive --drop

## TLS

Certs renew via webroot (`scripts/fix-certbot-webroot.sh` migrated them off the
nginx plugin). The nginx container serves `/.well-known/acme-challenge/` from
`/var/www/certbot`, and the deploy hook reloads nginx inside the container.
