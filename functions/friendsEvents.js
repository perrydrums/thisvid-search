const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const AdBlockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adBlocker = AdBlockerPlugin({
  blockTrackers: true,
});
puppeteer.use(adBlocker);

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
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
        message: 'Missing username or password query parameters',
        success: false,
      }),
      headers,
    };
  }

  const options = {
    executablePath: process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
  };

  if (!process.env.CHROME_EXECUTABLE_PATH) {
    // Use @sparticuz/chromium defaults for Netlify/Lambda
    options.args = chromium.args;
    options.defaultViewport = chromium.defaultViewport;
    options.headless = chromium.headless;
  }

  let browser;
  try {
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // Set longer timeout for slow connections
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    // Navigate to login page
    await page.goto('https://thisvid.com/login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Fill login form
    await page.waitForSelector('#login_username');
    await page.type('#login_username', username);
    await page.type('#login_pass', password);

    // Submit form - try to find submit button or form element
    const submitButton = await page.$('input[type="submit"], button[type="submit"], form input[type="submit"]');
    if (submitButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        submitButton.click(),
      ]);
    } else {
      // Fallback: submit the form directly
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.submit();
      });
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // Check if login was successful by checking if we're redirected away from login page
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

    // Navigate to friends events page
    await page.goto('https://thisvid.com/my_friends_events/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Scroll page to trigger lazy loading of images
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(null);
          }
        }, 100);
      });
    });

    // Wait a bit for lazy-loaded images to load
    await page.waitForTimeout(1000);

    // Extract video data
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
        let thumbnail = '';
        if (thumbImg) {
          // Check for lazy-loaded images - try current src first (after lazy load), then data-src, then src
          thumbnail =
            thumbImg.src ||
            thumbImg.getAttribute('data-src') ||
            thumbImg.getAttribute('src') ||
            '';
          // Handle protocol-relative URLs
          if (thumbnail && thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail;
          }
          // Remove data:image placeholders
          if (thumbnail && thumbnail.startsWith('data:image')) {
            thumbnail = '';
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

    // Sort videos by uploader name
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
      await browser.close();
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'Internal Server Error',
        message: error.message || 'An error occurred while fetching friends events',
        success: false,
      }),
      headers,
    };
  }
};
