import { getIp } from './getIp';

// Backup the global fetch so we can restore it later
const originalFetch = global.fetch;

describe('getIp', () => {
  beforeEach(() => {
    // Reset global.fetch before each test to clear mocked states
    global.fetch = jest.fn();
  });

  afterAll(() => {
    // Restore global fetch
    global.fetch = originalFetch;
  });

  it('should successfully fetch and return an IP address', async () => {
    const mockIp = '192.168.1.1';
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ ip: mockIp }),
    };

    // Typecast to any to avoid complex mock typings for fetch
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const ip = await getIp();

    expect(global.fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledTimes(1);
    expect(ip).toBe(mockIp);
  });

  it('should throw an error if the fetch fails', async () => {
    const mockError = new Error('Network error');

    (global.fetch as jest.Mock).mockRejectedValue(mockError);

    await expect(getIp()).rejects.toThrow('Network error');

    expect(global.fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
