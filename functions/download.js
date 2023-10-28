const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-extra');
const AdBlockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adBlocker = AdBlockerPlugin({
  blockTrackers: true,
});
puppeteer.use(adBlocker);

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

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath,
    headless: true,
    timeout: 10000,
  });

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
    body: JSON.stringify({
      status: 'Ok',
      page: {
        videoUrl,
      },
    }),
  };
};
