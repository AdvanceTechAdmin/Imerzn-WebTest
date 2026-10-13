import { test } from '@playwright/test';

export async function step<T>(title: string, action: () => Promise<T>): Promise<T> {
  return test.step(title, async () => {
    console.info(`[STEP] ${title}`);
    try {
      return await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[FAILED] ${title}: ${message}`);
      throw new Error(`Step "${title}" failed: ${message}`, { cause: error });
    }
  });
}
