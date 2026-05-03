const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const AdBlockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adBlocker = AdBlockerPlugin({
  blockTrackers: true,
});
puppeteer.use(adBlocker);

const { requireSiteOrigin } = require('./allowedOrigins');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=7200, s-maxage=7200',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  const method = (event.httpMethod || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  const forbidden = requireSiteOrigin(event);
  if (forbidden) return forbidden;

  if (method !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        status: 'Method Not Allowed',
        message: 'Use POST with JSON body: { "username": "...", "password": "..." }',
        success: false,
      }),
      headers,
    };
  }

  let username;
  let password;
  try {
    const parsed = JSON.parse(event.body || '{}');
    username = typeof parsed.username === 'string' ? parsed.username.trim() : '';
    password = typeof parsed.password === 'string' ? parsed.password : '';
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Expected JSON body with username and password',
        success: false,
      }),
      headers,
    };
  }

  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing username or password',
        success: false,
      }),
      headers,
    };
  }

  const options = {
    executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
  };

  if (!process.env.CHROME_EXECUTABLE_PATH) {
    options.args = chromium.args;
    options.defaultViewport = chromium.defaultViewport;
    options.headless = chromium.headless;
  }

  let browser;
  try {
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    await page.goto('https://thisvid.com/login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('#login_username');
    await page.type('#login_username', username);
    await page.type('#login_pass', password);

    const submitButton = await page.$('input[type="submit"], button[type="submit"], form input[type="submit"]');
    if (submitButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        submitButton.click(),
      ]);
    } else {
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.submit();
      });
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    const currentUrl = page.url();
    if (currentUrl.includes('login.php')) {
      await browser.close();
      return {
        statusCode: 401,
        body: JSON.stringify({
          status: 'Unauthorized',
          message: 'Invalid username or password',
          success: false,
        }),
        headers,
      };
    }

    await page.goto('https://thisvid.com/my_friends_events/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const videos = await page.evaluate(() => {
      const entries = document.querySelectorAll('.entry');
      const videoData = [];

      entries.forEach((entry) => {
        const userAvatarLink = entry.querySelector('.user-avatar a');
        const uploader = userAvatarLink ? userAvatarLink.getAttribute('title') : '';

        const thumbsLink = entry.querySelector('.thumbs-items a');
        const videoUrl = thumbsLink ? thumbsLink.getAttribute('href') : '';

        const titleElement = entry.querySelector('.title');
        const title = titleElement ? titleElement.textContent.trim() : '';

        const thumbImg = entry.querySelector('.thumb img');
        const thumbElement = entry.querySelector('.thumb');
        let thumbnail = '';

        if (thumbElement) {
          const isPrivate = thumbElement.classList.contains('private');

          if (isPrivate) {
            const style = thumbElement.getAttribute('style') || '';
            const backgroundMatch = style.match(/background:\s*url\(([^)]+)\)/);
            if (backgroundMatch && backgroundMatch[1]) {
              thumbnail = backgroundMatch[1].trim();
              thumbnail = thumbnail.replace(/^["']|["']$/g, '');
            }
          } else if (thumbImg) {
            thumbnail = thumbImg.getAttribute('data-original') || thumbImg.getAttribute('src') || '';
          }

          if (thumbnail && thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail;
          }
        }

        if (uploader && videoUrl && title) {
          videoData.push({
            uploader,
            title,
            thumbnail,
            url: videoUrl,
          });
        }
      });

      return videoData;
    });

    await browser.close();
    browser = null;

    videos.sort((a, b) => a.uploader.localeCompare(b.uploader));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        videos,
      }),
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
    console.error('friendsEvents:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: 'Failed to load friends events',
        success: false,
      }),
      headers,
    };
  }
};
