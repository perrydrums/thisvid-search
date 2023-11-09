import cheerio from 'cheerio';

type Category = {
  name: string;
  image: string;
  slug: string;
};

export const getCategories = async (): Promise<Array<Category>> => {
  const response = await fetch('/categories/');
  const body = await response.text();
  const $ = cheerio.load(body);

  return $('.thumbs-categories a')
    .map((i, element) => {
      return {
        name: $('span.title', element)
          .text()
          .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase())),
        image: $('img', element).attr('src')?.replace('//', 'https://') || '',
        slug: $(element).attr('href')?.split('/').filter(Boolean).pop() || '',
      };
    })
    .get();
};
