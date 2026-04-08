import { extractProfileFromAnalyseData, TasteProfile } from './recommendations';
import { AnalyseFavouriteUsers } from './analyseFavourites';
import * as getCategoriesModule from './getCategories';

jest.mock('./getCategories');

describe('extractProfileFromAnalyseData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract correct taste profile from empty analyse data', async () => {
    (getCategoriesModule.getCategories as jest.Mock).mockResolvedValue([]);
    const users: AnalyseFavouriteUsers = {};
    const result: TasteProfile = await extractProfileFromAnalyseData(users);

    expect(result).toEqual({
      categories: [],
      tags: [],
      uploaders: [],
      totalVideos: 0,
    });
  });

  it('should extract correct taste profile with valid analyse data', async () => {
    (getCategoriesModule.getCategories as jest.Mock).mockResolvedValue([
      { name: 'Amateur', slug: 'amateur-slug', image: '', orientation: 'straight' },
      { name: 'Teens', slug: 'teens-slug', image: '', orientation: 'straight' }
    ]);

    const users: AnalyseFavouriteUsers = {
      user1: {
        username: 'user1',
        url: '/members/123/',
        avatar: '',
        count: 2,
        videos: [
          {
            title: 'video 1',
            thumbnail: '',
            description: '',
            category: 'Amateur',
            tags: ['tag1', 'tag2'],
            username: 'user1',
            userUrl: '/members/123/',
            url: '/video/1'
          },
          {
            title: 'video 2',
            thumbnail: '',
            description: '',
            category: 'Amateur',
            tags: ['tag2', 'tag3'],
            username: 'user1',
            userUrl: '/members/123/',
            url: '/video/2'
          }
        ]
      },
      user2: {
        username: 'user2',
        url: '/members/456/',
        avatar: '',
        count: 1,
        videos: [
          {
            title: 'video 3',
            thumbnail: '',
            description: '',
            category: 'Teens',
            tags: ['tag1'],
            username: 'user2',
            userUrl: '/members/456/',
            url: '/video/3'
          }
        ]
      }
    };

    const result: TasteProfile = await extractProfileFromAnalyseData(users);

    expect(result.totalVideos).toBe(3);

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toEqual({ name: 'Amateur', slug: 'amateur-slug', count: 2 });
    expect(result.categories[1]).toEqual({ name: 'Teens', slug: 'teens-slug', count: 1 });

    expect(result.tags).toHaveLength(3);
    expect(result.tags[0]).toEqual({ name: 'tag1', count: 2 });
    expect(result.tags[1]).toEqual({ name: 'tag2', count: 2 });
    expect(result.tags[2]).toEqual({ name: 'tag3', count: 1 });

    expect(result.uploaders).toHaveLength(2);
    expect(result.uploaders[0]).toEqual({ username: 'user1', uid: '123', count: 2 });
    expect(result.uploaders[1]).toEqual({ username: 'user2', uid: '456', count: 1 });
  });

  it('should handle unresolvable categories by slugifying them', async () => {
    (getCategoriesModule.getCategories as jest.Mock).mockResolvedValue([]);

    const users: AnalyseFavouriteUsers = {
      user1: {
        username: 'user1',
        url: '/members/123/',
        avatar: '',
        count: 1,
        videos: [
          {
            title: 'video 1',
            thumbnail: '',
            description: '',
            category: 'Unresolved Category',
            tags: [],
            username: 'user1',
            userUrl: '/members/123/',
            url: '/video/1'
          }
        ]
      }
    };

    const result = await extractProfileFromAnalyseData(users);

    expect(result.categories[0]).toEqual({
      name: 'Unresolved Category',
      slug: 'unresolved-category',
      count: 1
    });
  });
});
