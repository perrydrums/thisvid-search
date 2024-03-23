import cheerio from 'cheerio';

export const getUsername = async (id: string): Promise<string | null> => {
  if (id) {
    const userResponse = await fetch(`/members/${id}/`);

    if (userResponse.status === 404) {
      return null;
    }

    const userBody = await userResponse.text();
    const $user = cheerio.load(userBody);

    return $user('.profile-menu .headline h2').text() || 'username not found';
  }

  return null;
};

export const getNameWithSeed = async (visitorId: string, numNames = 10): Promise<string> => {
  const url = `https://randomuser.me/api/?seed=${visitorId}&results=${numNames}&inc=name`;
  const response = await fetch(url);
  const data = await response.json();

  // Extract all first names and titles from the response.
  const names = data.results;

  console.log('names', names);

  for (const {
    name: { title, first, last },
  } of names) {
    // Check if the title is 'Mr'
    if (title === 'Mr') {
      return first + ' ' + last;
    }
  }
  return visitorId;
};
