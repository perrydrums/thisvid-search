const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const AdBlockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adBlocker = AdBlockerPlugin({
  blockTrackers: true,
});
puppeteer.use(adBlocker);

const { requireSiteOrigin } = require('./allowedOrigins');
const { assertAbsoluteThisvidHttps } = require('./validateThisvidUrl');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing url query parameter',
      }),
    };
  }

  let safeUrl;
  try {
    safeUrl = assertAbsoluteThisvidHttps(url);
  } catch {
    console.warn('download: rejected non-ThisVid URL');
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Invalid url',
      }),
    };
  }

  let browser;

  try {
    const options = {
      executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
    };

    if (!process.env.CHROME_EXECUTABLE_PATH) {
      options.args = chromium.args;
      options.defaultViewport = chromium.defaultViewport;
      options.headless = chromium.headless;
    }

    browser = await puppeteer.launch(options);

    const page = await browser.newPage();
    await page.goto(safeUrl);

    await page.click('.video-holder');

    await page.waitForSelector('video');

    const videoUrl = await page.evaluate(() => {
      const el = document.querySelector('video');
      return el && el.src ? el.src : '';
    });

    await browser.close();
    browser = null;

    if (!videoUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'Internal Server Error',
          message: 'Could not find video URL',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ videoUrl }),
      headers,
    };
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    console.error('download:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: 'Download failed',
      }),
    };
  }
};
