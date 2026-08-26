#!/bin/sh
# Renewal has failed daily since July because the certs are configured with the
# nginx *plugin*, but nginx runs in Docker — certbot finds no host service and
# dies with "nginx restart failed". Switch to webroot, which needs nothing but a
# writable directory that the nginx container serves at /.well-known/.
set -eu
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
sudo chown -R pkseugm:pkseugm /var/www/certbot

for conf in /etc/letsencrypt/renewal/*.conf; do
    sudo sed -i 's/^authenticator = nginx/authenticator = webroot/' "$conf"
    sudo sed -i '/^installer = nginx/d' "$conf"
    grep -q '^webroot_path' "$conf" \
        || sudo sed -i '/^\[renewalparams\]/a webroot_path = /var/www/certbot,' "$conf"
    echo "patched $(basename "$conf")"
done

sudo certbot renew --force-renewal \
    --deploy-hook 'docker exec webapp-nginx-1 nginx -s reload'

for d in pkseugm.web.id cms.pkseugm.web.id dummy.pkseugm.web.id; do
    printf '%s: ' "$d"
    sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$d/fullchain.pem"
done
