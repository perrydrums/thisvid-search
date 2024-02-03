const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=80000',
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

  const result = await fetch(
    `https://main-bvxea6i-stzzsy25tku52.de-2.platformsh.site/feed?username=${username}&password=${password}`,
  );
  const videos = await result.json();

  const currentDate = new Date().toLocaleDateString('en-GB').replaceAll('/', '-');

  return {
    statusCode: 200,
    body: JSON.stringify({ currentDate, videos }),
    headers,
  };
};
