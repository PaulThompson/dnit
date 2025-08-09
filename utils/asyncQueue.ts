export type Action<T> = () => Promise<T>;

// based on https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
export class AsyncQueue {
  inProgress = 0;
  concurrency: number;

  queue: {
    action: Action<unknown>;
    resolve: (t: unknown) => void;
    reject: (err: unknown) => void;
  }[] = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  /// Schedule an action for start later.  Immediately returns a Promise<T> but actual
  /// work of the original action->promise starts later
  schedule<T>(action: Action<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        action: action as Action<unknown>,
        resolve: resolve as (t: unknown) => void,
        reject,
      });
      this.startQueuedItem();
    });
  }

  /// Start an action from the front of the queue.
  private startQueuedItem(): void {
    if (this.inProgress >= this.concurrency) {
      return;
    }
    const item = this.queue.shift();
    if (item === undefined) {
      // is empty
      return;
    }

    this.inProgress += 1;
    item.action()
      .then((val: unknown) => {
        item.resolve(val);
      })
      .catch((err) => {
        item.reject(err);
      })
      .finally(() => {
        this.inProgress -= 1;
        this.startQueuedItem();
      });
  }
}
