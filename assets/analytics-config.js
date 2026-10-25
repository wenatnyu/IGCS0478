/* Public configuration only. Never put an admin password or API secret here.
 * Enable only after deploying and checking the analytics backend.
 */
window.IGCS_ANALYTICS = Object.freeze({
  enabled: true,
  endpoint: 'https://igcs0478-analytics.igcs0478-private-analytics.workers.dev',
  allowedOrigins: ['https://wenatnyu.github.io'],
  pathPrefix: '/IGCS0478/'
});
