import { test } from '@playwright/test';

/**
 * Run a named test step: logs it to the terminal, shows it in the HTML report and trace,
 * and prefixes any failure with the step name.
 */
export async function step<T>(title: string, action: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    // Log the step so CI output shows how far the test got.
    console.info(`[STEP] ${title}`);
    try {
      return await action();
    } catch (error) {
      // Re-throw with the step name in front, keeping the original error as the cause.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAILED] ${title}: ${message}`);
      throw new Error(`Step "${title}" failed: ${message}`, { cause: error });
    }
  });
}
