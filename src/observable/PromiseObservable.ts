import {root} from '../util/root';
import {Scheduler} from '../Scheduler';
import {Observable} from '../Observable';
import {Subscriber} from '../Subscriber';
import {Subscription} from '../Subscription';

/**
 *
 */
export class PromiseObservable<T> extends Observable<T> {

  public value: T;

  /**
   * @param promise
   * @param scheduler
   * @return {PromiseObservable}
   * @static true
   * @name fromPromise
   * @owner Observable
   */
  static create<T>(promise: Promise<T>, scheduler: Scheduler = null): Observable<T> {
    return new PromiseObservable(promise, scheduler);
  }

  constructor(private promise: Promise<T>, public scheduler: Scheduler = null) {
    super();
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription | Function | void {
    const promise = this.promise;
    const scheduler = this.scheduler;

    if (scheduler == null) {
      if (this._isScalar) {
        if (!subscriber.isUnsubscribed) {
          subscriber.next(this.value);
          subscriber.complete();
        }
      } else {
        promise.then(
          (value) => {
            this.value = value;
            this._isScalar = true;
            if (!subscriber.isUnsubscribed) {
              subscriber.next(value);
              subscriber.complete();
            }
          },
          (err) => {
            if (!subscriber.isUnsubscribed) {
              subscriber.error(err);
            }
          }
        )
        .then(null, err => {
          // escape the promise trap, throw unhandled errors
          root.setTimeout(() => { throw err; });
        });
      }
    } else {
      if (this._isScalar) {
        if (!subscriber.isUnsubscribed) {
          return scheduler.schedule(dispatchNext, 0, { value: this.value, subscriber });
        }
      } else {
        promise.then(
          (value) => {
            this.value = value;
            this._isScalar = true;
            if (!subscriber.isUnsubscribed) {
              subscriber.add(scheduler.schedule(dispatchNext, 0, { value, subscriber }));
            }
          },
          (err) => {
            if (!subscriber.isUnsubscribed) {
              subscriber.add(scheduler.schedule(dispatchError, 0, { err, subscriber }));
            }
          })
          .then(null, (err) => {
            // escape the promise trap, throw unhandled errors
            root.setTimeout(() => { throw err; });
          });
      }
    }
  }
}

function dispatchNext({ value, subscriber }) {
  if (!subscriber.isUnsubscribed) {
    subscriber.next(value);
    subscriber.complete();
  }
}

function dispatchError({ err, subscriber }) {
  if (!subscriber.isUnsubscribed) {
    subscriber.error(err);
  }
}
