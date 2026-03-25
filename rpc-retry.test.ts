import { executeRpcWithRetry } from './rpc-retry';

describe('executeRpcWithRetry', () => {
  let mockRpc: jest.Mock;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRpc = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Use fake timers to skip waiting for exponential backoff during tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should return data immediately if successful', async () => {
    mockRpc.mockResolvedValue('success');
    const result = await executeRpcWithRetry(mockRpc);
    expect(result).toBe('success');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('should log a warning exactly after the 3rd failed attempt', async () => {
    // Fail 3 times, then succeed on the 4th
    mockRpc
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockResolvedValue('success');

    const promise = executeRpcWithRetry(mockRpc, 'TestContext');

    // Advance timers to trigger the scheduled retries
    for (let i = 0; i < 4; i++) {
      jest.runAllTimers();
      await Promise.resolve(); // Flush promise microtasks
    }

    await promise;

    expect(mockRpc).toHaveBeenCalledTimes(4);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARNING] TestContext: Failed 3 times')
    );
  });

  it('should crash (throw) after 10 retries (11 total attempts)', async () => {
    mockRpc.mockRejectedValue(new Error('Persistent Error'));

    const promise = executeRpcWithRetry(mockRpc);

    // Exhaust all retries
    for (let i = 0; i < 12; i++) {
      
      jest.runAllTimers();
      await Promise.resolve();
    }

    await expect(promise).rejects.toThrow('Persistent Error');
    // Initial attempt + 10 retries = 11 calls
    expect(mockRpc).toHaveBeenCalledTimes(11);
  });

  it('should abort immediately on 400 Bad Request (Client Error)', async () => {
    const badRequestError: any = new Error('Bad Request');
    badRequestError.response = { status: 400 };

    mockRpc.mockRejectedValue(badRequestError);

    await expect(executeRpcWithRetry(mockRpc)).rejects.toThrow('Bad Request');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});