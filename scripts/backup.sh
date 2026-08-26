#!/bin/sh
# Nightly backup of both Mongo instances plus the deploy config.
# Keeps DAYS days of history and refuses to run if the disk is nearly full,
# since a partial dump is worse than a missing one.
set -eu

DEST="${BACKUP_DIR:-/home/pkseugm/backups}"
DAYS="${RETAIN_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/$STAMP"

USED=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "$USED" -ge 90 ]; then
    echo "backup: aborting, root filesystem ${USED}% full" >&2
    exit 1
fi

mkdir -p "$OUT"
docker exec webapp-mongo-1 mongodump --db=webapp --archive --gzip > "$OUT/webapp-db.archive.gz"
docker exec eksplorazcy-mongodb mongodump --archive --gzip > "$OUT/eksplorazcy-db.archive.gz"
tar czf "$OUT/config.tgz" -C /home/pkseugm/webapp .env docker-compose.yml docker-compose.prod.yml nginx/default.conf 2>/dev/null || true

# A zero-length dump means mongodump failed; don't let it rotate a good one out.
for f in "$OUT"/*.archive.gz; do
    [ -s "$f" ] || { echo "backup: $f is empty" >&2; exit 1; }
done

find "$DEST" -maxdepth 1 -type d -name '20*' -mtime "+$DAYS" -exec rm -rf {} + 2>/dev/null || true
echo "backup: ok -> $OUT ($(du -sh "$OUT" | cut -f1))"
