
/**
 * oogy-cutscene
 * github.com/insanj/cutscene
 * (c) 2022 julian weiss <@insanj>
 */
export module OogyCutscene {

  /**
   * The public API, implemented by the OogyCutscenePerformer (near bottom of module).
   * @see OogyCutscenePerformer
   */
  export interface OogyCutsceneAPI {

    /**
     * Holds all tasks that are currently performing or are enqueued for performance (such as with `batch()`).
     * Mutation unavailable. If active tasks are invalid, use other API methods.
     */
    readonly activeTasks: OogyCutsceneTask[];

    /**
     * Basic method to make text display in an element currently in the DOM.
     * Uses the top item in `activeTasks`, or if none exists, the `task` provided.
     * If an `activeTask` already exists, will add this `task` to the queue and execute it afterwards.
     * Intended to wrap the performance of a single task, which is the smallest unit of text & element.
     * @param task 
     * @see OogyCutsceneTask
     */
    perform(task?: OogyCutsceneTask): Promise<void>;

    /**
     * Identical to `perform(task:)` but for multiple items. 
     * Enqueues using `activeTasks`, and is performed sequentially. 
     * See each task's options for ways to make tasks appear to "overlap"/happen at the same time.
     * This is the preferable way to animate more than one task.
     * @param tasks 
     * @see perform
     */
    batch(tasks?: OogyCutsceneTask[]): Promise<void>;

    /**
     * Pause the currently active task; those that are performing either on their own or as a part of a batch will remain in the paused state until `unpause` is called.
     * Pausing is enforced on a letter-by-letter basis, after the "wait" option duration.
     * Instant, so no need for async/Promise handling.
     * @see unpause
     */
    pause(): void;

    /**
     * Unpause the current task, if we are currently paused, and resume animating from the last letter that was animated.
     * Async because pausing is instant, but unpausing means picking up where `perform` or `batch` left off.
     * @see pause
     */
    unpause(): Promise<void>;

  }

  /**
   * The smallest representation of a task or step that the Cutscene API can process and display. The fundamental data structure used in this module.
   * @see OogyCutsceneAPI
   */
  export type OogyCutsceneTask = {

    /**
     * Innermost DOM element which will hold the text (`textContent`).
     * If not present in the DOM, will still attempt to perform task, but results may vary.
     */
    element: Element;

    /**
     * Complete text that shall be rendered into the `element`.
     * If undefined, will use `options` to remove the existing element's `textContent` instead.
     */
    text?: string;

    /**
     * Optional options to pass to customize the presentation of the `text` in the `element`. If not provided, the default set of options will be used.
     * @see OogyCutsceneTaskOptions
     * @see kOogyCutsceneTaskOptionsDefault
     */
    options?: OogyCutsceneTaskOptions;

  }

  /**
   * All supported options for a cutscene task. 
   * Breaks down the performance animation into duration per letter, as well as handles details such as clearing existing text from the task's element.
   * Used to customize when text is rendered, as well as when text is cleared, if undefined is passed to `perform` or `batch`.
   * @see kOogyCutsceneTaskOptionsDefault
   */
  export type OogyCutsceneTaskOptions = {

    /**
     * If the `textContent` of the `element` for this task should be erased before performing this task's presentation.
     */
    shouldClearExistingText: boolean;

    /**
     * Amount of milliseconds each letter should be animated for when presenting.
     * Any value < 0 will be discarded and the animation skipped entirely for this task.
     */
    durationPerLetter: number;

    /**
     * Amount of milliseconds this letter should halt the flow of text. 
     * 0 to allow the next letter to appear at the same time as this one.
     * Defaults to the same as `durationPerLetter`.
     */
    waitAfterLetter: number;

    /**
     * Kind of animation to use for each letter in this task.
     */
    animationKind: OogyCutsceneTaskAnimationKind;

    /**
     * Optional async prepare block that will run before the performance starts.
     */
    blockingPrepareAction?: () => Promise<void>;

    /**
     * Optional async completion block that will halt the current performance until it resolves.
     */
    blockingCompletionAction?: () => Promise<void>;

  }

  /**
   * Supported animation kinds.
   * Each represents a CSS animation that will be added to the `element` when `perform` is in progress.
   */
  export enum OogyCutsceneTaskAnimationKind {
    none = 'none',
    fadeIn = 'fadeIn',
  }

  /**
   * Default options for a task. Used if no `options` provided.
   * Can be experienced in the example or README gifs.
   * @see OogyCutsceneTask
   */
  export const kOogyCutsceneTaskOptionsDefault: OogyCutsceneTaskOptions = {
    shouldClearExistingText: true,
    durationPerLetter: 50,
    waitAfterLetter: 25,
    animationKind: OogyCutsceneTaskAnimationKind.none,
    blockingCompletionAction: async () => {
      await new Promise((resolve, reject) => setTimeout(resolve, 200));
    }
  };

  /**
   * Internal per-letter animation options which is created using the task options.
   * Used by the `OogyCutscenePerformer`. 
   */
  type OogyCutsceneAnimationLetterOptions = {
    letter: string;

    element: Element;

    duration: number;

    kind: OogyCutsceneTaskAnimationKind;
  }

  /**
   * Full implementation of the cutscene API; the core logic and runtime for the module.
   */
  export class OogyCutscenePerformer implements OogyCutsceneAPI {

    get activeTasks(): OogyCutsceneTask[] {
      return Array.from(this._activeTasks.values());
    }

    /**
     * Store tasks in a UUID-keyed map so we can remove them when complete and queue them successfully.
     */
    private _activeTasks: Map<string, OogyCutsceneTask> = new Map<string, OogyCutsceneTask>();

    private isPaused: boolean = false;

    private pausedLetterIndex: number | undefined = undefined;

    async perform(task?: OogyCutsceneTask): Promise<void> {

      if (task === undefined) {
        if (this._activeTasks.size < 1) {
          // no tasks to perform ?!
          throw new Error("OogyCutscenePerformer: asked to perform with no task given, and no activeTasks queued. This is not a proper use of the API.");
        }

        const enqueuedUUIDs = Array.from(this._activeTasks.keys());
        const nextUUID = enqueuedUUIDs[0];
        const nextTask = this._activeTasks.get(nextUUID)!;
      
        await this.performEnqueuedTask(
          nextTask,
          nextUUID
        );

        return;
      }

      const uuid = this.generateUUID();
      this._activeTasks.set(uuid, task);

      if (this._activeTasks.size > 1) {
        // there are active tasks, which means we should ALREADY be performing
        // or are paused, in which case, this method should do nothing
        return;
      }

      // clear to perform this task, nothing else queued up before it
      await this.performEnqueuedTask(
        task,
        uuid
      );

    }

    private async performEnqueuedTask(
      task: OogyCutsceneTask, 
      uuid: string
    ): Promise<void> {

      const element = task.element;

      // step 1: process options, and determine if we should clear the element
      const options = task.options !== undefined ? task.options : kOogyCutsceneTaskOptionsDefault;

      if (options.blockingPrepareAction !== undefined) {
        await options.blockingPrepareAction();
      }

      if (options.shouldClearExistingText === true) {
        // -> clear existing element textContent
        element.textContent = '';
      }

      // step 2: begin animating each letter
      if (task.text !== undefined) {
        const letters = task.text.split("");
        const letterAnimDuration = options.durationPerLetter;
        const letterAnimKind = options.animationKind;
        const letterAnimWaitAfter = options.waitAfterLetter;

        const letterStartingIdx = this.pausedLetterIndex !== undefined ? this.pausedLetterIndex : 0;
        if (letterStartingIdx >= letters.length) {
          // not enough letters (left), so use task options to simply wait and return
          await this.wait(letterAnimWaitAfter);
        }
        
        else {
          // time to animate each letter, checking for pause after each wait after
          for (let i = letterStartingIdx; i < letters.length; i++) {
            const letter = letters[i];
            if (this.isPaused === true) {
              // interrupt if paused and save index to begin here when unpaused
              this.pausedLetterIndex = i;
              return;
            }
  
            const letterAnimationOpts: OogyCutsceneAnimationLetterOptions = {
              letter,
              element,
              duration: letterAnimDuration,
              kind: letterAnimKind
            };
            
            this.animateLetter(letterAnimationOpts);
            await this.wait(letterAnimWaitAfter);
          }
        }
      } // end if task.text !== undefined

      // before finishing, check if the optional blockingCompletionAction exists
      if (options.blockingCompletionAction !== undefined) {
        await options.blockingCompletionAction();
      }

      // step 3: when complete, resolve and remove from queue, trigger next to play if exists
      this._activeTasks.delete(uuid);

      if (this._activeTasks.size > 0) {
        await this.perform();
      }
    }

    /**
     * Generate random UUID for use in `activeTasks`
     * @returns 
     */
    private generateUUID(): string {
      return (window.crypto as any).randomUUID();
    }

    /**
     * Wait for a certain amount of milliseconds using `setTimeout`
     * @param duration 
     */
    private async wait(duration: number) {
      await new Promise((resolve, reject) => { setTimeout(resolve, duration) });
    }
   
    /**
     * Animate an individual letter using letter animation options, built from the task options
     * @param options 
     */
    private animateLetter(options: OogyCutsceneAnimationLetterOptions) {

      const element = options.element;
      const letter = options.letter;

      if (options.kind === OogyCutsceneTaskAnimationKind.none) {

        element.textContent += letter;

      }

      else {

        // create span to hold presentation animation
        const animationSpan = document.createElement('span');
        animationSpan.textContent = letter;
        animationSpan.style.transition = 'all 1s ease-in-out';
        element.appendChild(animationSpan);

      }

    }
    
    async batch(tasks: OogyCutsceneTask[]): Promise<void> {
      
      for (let task of tasks) {
        const uuid = this.generateUUID();
        this._activeTasks.set(uuid, task);
      }

      await this.perform();

    }

    pause(): void {
      this.isPaused = true;
    }

    async unpause(): Promise<void> {
      this.isPaused = false;

      if (this.pausedLetterIndex !== undefined) {
        await this.perform();
      }
    }

  }

}
