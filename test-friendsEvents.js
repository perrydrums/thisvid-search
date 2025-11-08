// Test script for friendsEvents function
// Usage: node test-friendsEvents.js <username> <password>
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

// Create a mock event object similar to what Netlify Functions receive
const event = {
  queryStringParameters: {
    username: username,
    password: password,
  },
};

const context = {};

// Call the handler
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
