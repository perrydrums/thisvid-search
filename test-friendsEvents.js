// Test script for friendsEvents function
// Usage: node test-friendsEvents.js <username> <password>
//
// When SITE_ALLOWED_ORIGINS is set on the function, add a matching Origin header, e.g.
//   SITE_ALLOWED_ORIGINS="http://localhost" node test-friendsEvents.js ...
//
// For local testing, you may need to set CHROME_EXECUTABLE_PATH environment variable
// to point to your local Chrome installation:
//   macOS: CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node test-friendsEvents.js <username> <password>
//   Linux: CHROME_EXECUTABLE_PATH="/usr/bin/google-chrome" node test-friendsEvents.js <username> <password>
//   Windows: CHROME_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" node test-friendsEvents.js <username> <password>

const handler = require('./functions/friendsEvents').handler;

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Usage: node test-friendsEvents.js <username> <password>');
  process.exit(1);
}

const event = {
  httpMethod: 'POST',
  headers: {},
  body: JSON.stringify({ username, password }),
};

const context = {};

handler(event, context)
  .then((response) => {
    console.log('Status Code:', response.statusCode);
    console.log('Response:', JSON.stringify(JSON.parse(response.body), null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
