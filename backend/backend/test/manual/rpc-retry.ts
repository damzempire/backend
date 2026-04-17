import pRetry, { AbortError, FailedAttemptError } from 'p-retry';

/**
 * Wraps an RPC call with an exponential backoff retry mechanism.
 *
 * Acceptance Criteria:
 * 1. Exponential backoff (factor: 2).
 * 2. Log warning after 3 failed attempts.
 * 3. Crash (throw) only after 10 failed attempts.
 */
export async function executeRpcWithRetry<T>(
  rpcFunction: () => Promise<T>,
  context: string = 'RPC Call'
): Promise<T> {
  const run = async () => {
    try {
      return await rpcFunction();
    } catch (error: any) {
      // Stellar SDK / Axios errors usually have a response object.
      // We should NOT retry on 4xx errors (Client Error), except for 429 (Rate Limit).
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw new AbortError(error);
      }
      throw error;
    }
  };

  return pRetry(run, {
    retries: 10,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 60000,
    onFailedAttempt: (error: FailedAttemptError) => {
      if (error.attemptNumber === 3) {
        console.warn(
          `[WARNING] ${context}: Failed 3 times. Retrying... Error: ${error.message}`
        );
      }
    },
  });
}