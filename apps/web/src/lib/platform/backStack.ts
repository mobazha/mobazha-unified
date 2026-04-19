/**
 * G1 — BackAction LIFO stack (framework-agnostic).
 *
 * Both the TG and Web adapters need identical stack semantics:
 *   * non-empty stack → call the top handler only; don't propagate
 *   * stack becomes non-empty → surface the BackButton (TG) / attach listener (Web)
 *   * stack becomes empty    → hide the BackButton (TG) / detach listener (Web)
 *
 * This module encapsulates the stack and notifies observers of empty ↔ non-empty
 * transitions, so each adapter only wires the side effect once.
 *
 * Notes on correctness:
 *  - Every `push` returns a single-use cleanup. Calling cleanup twice is a
 *    no-op (idempotent) so React Strict Mode double-invocation is safe.
 *  - Handlers are compared by identity, so the *same* function reference may
 *    be pushed multiple times (different layers) without collapsing.
 */

export type BackHandler = () => void;
export type BackStackObserver = (hasHandler: boolean) => void;

export class BackActionStack {
  private readonly handlers: BackHandler[] = [];
  private readonly observers = new Set<BackStackObserver>();

  push(handler: BackHandler): () => void {
    this.handlers.push(handler);
    if (this.handlers.length === 1) this.notify(true);

    let cleaned = false;
    return () => {
      if (cleaned) return;
      cleaned = true;
      // Remove the most recent matching reference (LIFO), not every match —
      // this preserves the correct layer if the same handler was pushed by
      // two sibling modals (rare but well-defined).
      for (let i = this.handlers.length - 1; i >= 0; i--) {
        if (this.handlers[i] === handler) {
          this.handlers.splice(i, 1);
          break;
        }
      }
      if (this.handlers.length === 0) this.notify(false);
    };
  }

  /**
   * Invoke the top handler. Returns `true` when a handler was invoked
   * (caller should *suppress* its default back behavior), `false` when the
   * stack was empty (caller should fall back to router.back / TG close).
   */
  trigger(): boolean {
    const top = this.handlers[this.handlers.length - 1];
    if (!top) return false;
    try {
      top();
    } catch (err) {
      // Swallow to protect the stack; business code should handle its own errors.
      // Logging here would be platform-specific; re-throw in tests by spying.
      if (typeof console !== 'undefined') {
        console.error('[BackActionStack] handler threw', err);
      }
    }
    return true;
  }

  /** True when there is at least one handler on the stack. */
  get hasHandler(): boolean {
    return this.handlers.length > 0;
  }

  /** Current stack depth — for debugging / tests. */
  get size(): number {
    return this.handlers.length;
  }

  subscribe(observer: BackStackObserver): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  private notify(hasHandler: boolean): void {
    // Snapshot to tolerate observers that unsubscribe during notification.
    for (const observer of Array.from(this.observers)) {
      try {
        observer(hasHandler);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error('[BackActionStack] observer threw', err);
        }
      }
    }
  }
}
