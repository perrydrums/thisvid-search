const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/newest',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/new-private',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/gay-newest',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/gay-private',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/members',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/videos',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/categories',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/tags',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/female-extreme',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/male-extreme',
    createProxyMiddleware({
      target: 'https://thisvid.com',
      changeOrigin: true,
    }),
  );

  app.use(
    '/getVideos',
    createProxyMiddleware({
      target: 'https://tvass.netlify.app/.netlify/functions',
      changeOrigin: true,
      pathRewrite: {
        '^/getVideos': '/videos',
      },
    }),
  );

  app.use(
    '/download',
    createProxyMiddleware({
      target: 'https://tvass.netlify.app/.netlify/functions',
      changeOrigin: true,
    }),
  );

  app.use(
    '/friends',
    createProxyMiddleware({
      target: 'https://tvass.netlify.app/.netlify/functions',
      changeOrigin: true,
    }),
  );

  app.use(
    '/friendsEvents',
    createProxyMiddleware({
      target: 'https://tvass.netlify.app/.netlify/functions',
      changeOrigin: true,
    }),
  );

};
