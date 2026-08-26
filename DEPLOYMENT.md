# Deployment

## Versioning contract

| You do | CI publishes | Server does |
|---|---|---|
| `git tag v1.4.0-rc1 && git push --tags` | `api/web:v1.4.0-rc1` **and** `:dev` | dev box pulls `:dev` |
| Publish a GitHub Release `v1.4.0` | `api/web:v1.4.0` **and** `:latest` | prod pulls `:latest` |

Every build carries an immutable `:vX.Y.Z` tag *and* moves a channel tag.
The immutable tag is for rollback and audit; the channel tag is what the
servers actually track.

There is no deploy step in CI and no deploy SSH key. CI publishes images;
**Watchtower** on the box polls GHCR every 5 minutes and pulls the channel tag
its containers are pinned to.

### Why containers track `:latest`, not `:v1.4.0`

Watchtower updates a container when the digest behind its tag changes. An
immutable version tag never changes, so pinning one freezes updates forever.
Prod therefore runs `:latest` and dev runs `:dev`; the release is what moves
those pointers.

Check what is actually live:

    curl -s https://pkseugm.web.id/healthz
    {"status":"ok","version":"v1.4.0"}

## No more debris

`WATCHTOWER_CLEANUP=true` deletes the superseded image after every update, and
because images are built in GitHub the host never accumulates build cache. That
combination is what caused the 22GB of dangling layers and 100%-full disk.

`WATCHTOWER_LABEL_ENABLE=true` means only containers carrying
`com.centurylinklabs.watchtower.enable=true` are touched — currently
`go-frontend` and `nginx`. **Mongo is deliberately excluded**: nothing should
restart the database behind your back.

## One-time setup

1. **Package visibility.** If the GHCR packages are private, create a PAT with
   `read:packages` and log in on the server so Watchtower can pull:

       ssh pkse
       echo <PAT> | docker login ghcr.io -u iZcy --password-stdin

   Making the packages public removes this step and the credential mount.

2. **Cut over to the published images** (only after the first tag has built,
   otherwise there is nothing to pull):

       ssh pkse
       cd ~/webapp
       docker compose -f docker-compose.yml down
       docker compose -f docker-compose.prod.yml up -d

3. Confirm Watchtower is watching:

       docker logs watchtower --tail 20

## Rollback

Point the channel tag back at a known-good build; Watchtower picks it up on the
next poll:

    docker pull ghcr.io/izcy/website-pkse-ugm/api:v1.3.0
    docker tag  ghcr.io/izcy/website-pkse-ugm/api:v1.3.0 ghcr.io/izcy/website-pkse-ugm/api:latest

For an immediate rollback, re-publish the previous release in GitHub, or run
`docker compose -f docker-compose.prod.yml up -d` with `CHANNEL=v1.3.0` pinned
(remembering that this suspends Watchtower until you move back to `latest`).

## Backups

`scripts/backup.sh`, nightly at 02:30 via `pkse-backup.timer`. Keeps 14 days in
`~/backups`, aborts if the root filesystem is >=90% full, and refuses to rotate
when a dump comes back empty.

    sudo cp scripts/pkse-backup.{service,timer} /etc/systemd/system/
    sudo systemctl enable --now pkse-backup.timer

Restore:

    gzip -dc backups/<stamp>/webapp-db.archive.gz \
      | docker exec -i webapp-mongo-1 mongorestore --archive --drop

## TLS

Certs renew via webroot. The nginx container serves
`/.well-known/acme-challenge/` from `/var/www/certbot`, and the deploy hook
reloads nginx inside the container. Verify with `sudo certbot renew --dry-run`.
