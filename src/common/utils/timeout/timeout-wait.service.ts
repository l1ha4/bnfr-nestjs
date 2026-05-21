import { Injectable, RequestTimeoutException } from '@nestjs/common'

@Injectable()
export class TimeoutWaitService {
  async waitWithTimeout(
    condition: () => Promise<boolean>,
    timeoutMessage: string,
    timeoutMs: number,
    intervalMs: number,
  ): Promise<void> {
    const startedAt = Date.now()

    while (true) {
      const isDone = await condition()

      if (isDone) {
        return
      }

      const elapsedMs = Date.now() - startedAt

      if (elapsedMs >= timeoutMs) {
        throw new RequestTimeoutException(timeoutMessage)
      }

      await this.sleep(intervalMs)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
