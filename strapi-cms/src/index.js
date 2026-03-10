'use strict';

const fs = require('fs');

module.exports = {
  register(/* { strapi } */) {},

  async bootstrap({ strapi }) {
    const TOKEN_FILE = '/opt/app/.panel-token';
    if (!fs.existsSync(TOKEN_FILE)) {
      try {
        const existing = await strapi.db.query('admin::api-token').findOne({
          where: { name: 'webapp-panel' },
        });
        if (!existing) {
          const { accessKey } = await strapi
            .service('admin::api-token')
            .create({
              name: 'webapp-panel',
              description: 'Custom panel pengurus website',
              type: 'full-access',
              lifespan: null,
            });
          fs.writeFileSync(TOKEN_FILE, accessKey, 'utf8');
          strapi.log.info('[bootstrap] Panel API token written to ' + TOKEN_FILE);
        }
      } catch (err) {
        strapi.log.warn('[bootstrap] Could not create API token: ' + err.message);
      }
    }
  },
};
