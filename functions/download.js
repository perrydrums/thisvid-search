const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const AdBlockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adBlocker = AdBlockerPlugin({
  blockTrackers: true,
});
puppeteer.use(adBlocker);

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=31536000',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const url = event.queryStringParameters.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing url query parameter',
      }),
    };
  }

  const options = {
    executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
  }

  if (!process.env.CHROME_EXECUTABLE_PATH) {
    options.args = chromium.args;
  }

  const browser = await puppeteer.launch(options);

  const page = await browser.newPage();
  await page.goto(url);

  // Play the video.
  await page.click('.video-holder');

  // Wait for the video to load.
  await page.waitForSelector('video');

  // Get the video URL.
  const videoUrl = await page.evaluate(() => {
    return document.querySelector('video').src;
  });

  await browser.close();

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
    body: JSON.stringify({videoUrl}),
    headers,
  };
};
