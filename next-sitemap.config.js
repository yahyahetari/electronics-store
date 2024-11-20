module.exports = {
    siteUrl: 'https://hetari-e-store.vercel.app',
    generateRobotsTxt: true,
    priority: 1.0,
    changefreq: 'daily',
    exclude: ['/api/*'],
    robotsTxtOptions: {
      additionalSitemaps: [
        'https://hetari-e-store.vercel.app/sitemap.xml',
      ],
    },
  }
  