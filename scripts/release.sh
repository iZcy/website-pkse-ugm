#!/usr/bin/env bash
# Cut a release without GitHub Actions.
#
# Builds both images, pushes them to GHCR under an immutable version tag plus a
# moving channel tag, and lets Watchtower on the server do the deploy. This is
# the same contract the CI workflow implements, so switching back to Actions
# later changes nothing about how the server behaves.
#
#   ./scripts/release.sh v1.1.0           -> :v1.1.0 + :dev     (dev channel)
#   ./scripts/release.sh v1.1.0 --prod    -> :v1.1.0 + :latest  (prod channel)
set -euo pipefail

BASE=ghcr.io/izcy/website-pkse-ugm
VERSION="${1:-}"
CHANNEL=dev
[ "${2:-}" = "--prod" ] && CHANNEL=latest

if [ -z "$VERSION" ]; then
    echo "usage: $0 vX.Y.Z [--prod]" >&2
    exit 1
fi
if ! printf '%s' "$VERSION" | grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
    echo "version must look like v1.2.3 or v1.2.3-rc1" >&2
    exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
    echo "working tree is dirty; commit before releasing" >&2
    exit 1
fi

echo "==> building $VERSION for channel :$CHANNEL"
docker build -f Dockerfile     --build-arg VERSION="$VERSION" -t "$BASE/api:$VERSION" -t "$BASE/api:$CHANNEL" .
docker build -f Dockerfile.web                                -t "$BASE/web:$VERSION" -t "$BASE/web:$CHANNEL" .

echo "==> pushing"
for img in api web; do
    docker push -q "$BASE/$img:$VERSION"
    docker push -q "$BASE/$img:$CHANNEL"
done

# Tag the commit the images were built from, so a version is always traceable
# back to source even though CI did not build it.
if ! git rev-parse "$VERSION" >/dev/null 2>&1; then
    git tag -a "$VERSION" -m "Release $VERSION"
    git push origin "$VERSION"
fi

if [ "$CHANNEL" = latest ] && command -v gh >/dev/null 2>&1; then
    gh release view "$VERSION" >/dev/null 2>&1 \
        || gh release create "$VERSION" --title "$VERSION" --generate-notes
fi

# Building on this host is a fallback for the Actions billing lock, so clean up
# after ourselves rather than letting layers pile up again.
docker image prune -f >/dev/null
docker builder prune -af >/dev/null 2>&1 || true

echo
echo "==> pushed $VERSION to :$CHANNEL"
echo "    Watchtower polls every 5 minutes. Confirm with:"
echo "    curl -s https://pkseugm.web.id/healthz"
