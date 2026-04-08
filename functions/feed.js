const fetch = require('node-fetch');

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=80000',
  'Netlify-Vary': 'query',
};

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        status: 'Method Not Allowed',
        message: 'Only POST requests are allowed',
      }),
      headers,
    };
  }

  let username, password;
  try {
    const body = JSON.parse(event.body);
    username = body.username;
    password = body.password;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Invalid JSON in request body',
      }),
      headers,
    };
  }

  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: 'Bad Request',
        message: 'Missing username and/or password in request body',
      }),
      headers,
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
