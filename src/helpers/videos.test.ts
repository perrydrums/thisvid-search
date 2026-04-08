import { getVideos } from './videos';

describe('getVideos', () => {
  let originalFetch: typeof global.fetch;
  let originalConsoleError: typeof console.error;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalConsoleError = console.error;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it('should return empty array and log error when fetch fails', async () => {
    // Mock fetch to reject
    const mockError = new Error('Network error');
    global.fetch = jest.fn().mockRejectedValue(mockError);

    // Mock console.error to avoid spamming the test output
    console.error = jest.fn();

    const options = {
      url: '/some-url',
      page: 1,
    };

    const result = await getVideos(options);

    expect(global.fetch).toHaveBeenCalledWith('/getVideos/', expect.objectContaining({
      method: 'POST',
      body: expect.any(String),
    }));

    expect(console.error).toHaveBeenCalledWith(mockError);
    expect(result).toEqual([]);
  });
});
