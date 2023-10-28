// import puppeteer from 'puppeteer';
//
// const downloadVideo = async (url) => {
//   const browser = await puppeteer.launch({headless: false});
//   const page = await browser.newPage();
//
//   await page.goto(`https://pastedownload.com/thisvid-video-downloader/#url=${url}`);
//
//   // Play the video.
//   await page.click('.video-holder');
//
//   // Wait for the video to load.
//   await page.waitForSelector('video');
//
//   const videoUrl = await page.evaluate(() => {
//     return document.querySelector('video').src;
//   });
//
//   console.log('vidurl', videoUrl);
//
//
//   // const $ = cheerio.load(body);
//   //
//   // // Play the video.
//   // $('.video-holder').first().click();
//   //
//   // // Wait for the video to load.
//   // await new Promise((resolve) => setTimeout(resolve, 2000));
//   //
//   // const videoUrl = $('video').first().attr('src');
//   //
//   // console.log('vidurl', videoUrl);
//   //
//   // return {videoUrl};
// }
//
// export default downloadVideo;
