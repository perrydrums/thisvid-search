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
  const username = event.queryStringParameters.username;
  const password = event.queryStringParameters.password;

  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing username and/or password query parameter',
      }),
    };
  }

  const options = {
    executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
  };

  if (!process.env.CHROME_EXECUTABLE_PATH) {
    options.args = chromium.args;
  }

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.goto('https://thisvid.com/login.php');

  await page.type('#login_username', username);
  await page.type('#login_pass', password);
  await page.click('button.login');

  await page.waitForNavigation();

  await page.goto('https://thisvid.com/my_friends_events/');

  const videos = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('.entry'));
    return elements.map((element) => {
      const author = element.querySelector('.user-avatar .tumbpu').title;
      const title = element.querySelector('.thumbs-items .tumbpu').title;
      const url = element.querySelector('.thumbs-items .tumbpu').href;
      return { author, title, url };
    });
  });

  await browser.close();
  const currentDate = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');

  return {
    statusCode: 200,
    body: JSON.stringify({ currentDate, videos }),
    headers,
  };
};
