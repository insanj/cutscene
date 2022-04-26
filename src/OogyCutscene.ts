
/**
 * oogy-cutscene
 * github.com/insanj/cutscene
 * (c) 2022 julian weiss <@insanj>
 */
export module OogyCutscene {

  /**
   * The public API
   */
  export interface OogyCutsceneAPI {

    /**
     * Basic method to make text display in an element currently in the DOM.
     * Wraps the performance of a single task, which is the smallest unit of text & element.
     * @param task 
     * @see OogyCutsceneTask
     */
    perform(task: OogyCutsceneTask): Promise<void>;

    /**
     * Identical to `perform(task:)` but for multiple items. Performed sequentially. See each task's options for ways to make tasks appear to "overlap"/happen at the same time.
     * @param tasks 
     * @see perform
     */
    batch(tasks: OogyCutsceneTask[]): Promise<void>;

  }

  /**
   * The smallest representation of a task or step that the Cutscene API can process and display. The fundamental data structure used in this module.
   * @see OogyCutsceneAPI
   */
  export type OogyCutsceneTask = {

    /**
     * Innermost DOM element which will hold the text (`innerText`).
     * If not present in the DOM, will still attempt to perform task, but results may vary.
     */
    element: Element;

    /**
     * Complete text that shall be rendered into the `element`.
     * If undefined, will use `options` to remove the existing element's `innerText` instead.
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
     * If the `innerText` of the `element` for this task should be erased before performing this task's presentation.
     */
    shouldClearExistingText: boolean;

    /**
     * Amount of milliseconds each letter should be animated for when presenting.
     * Any value < 0 will be discarded and the animation skipped entirely for this task.
     */
    durationPerLetter: number;

    /**
     * Kind of animation to use for each letter in this task.
     */
    animationKind: OogyCutsceneTaskAnimationKind;

  }

  /**
   * Supported animation kinds.
   * Each represents a CSS animation that will be added to the `element` when `perform` is in progress.
   */
  export enum OogyCutsceneTaskAnimationKind {
    none = 'none',
    fadeIn = 'fadeIn',
    fadeInTop = 'fadeInTop'
  }

  /**
   * Default options for a task. Used if no `options` provided.
   * Can be experienced in the example or README gifs.
   * @see OogyCutsceneTask
   */
  export const kOogyCutsceneTaskOptionsDefault: OogyCutsceneTaskOptions = {
    shouldClearExistingText: true,
    durationPerLetter: 100,
    animationKind: OogyCutsceneTaskAnimationKind.fadeInTop
  };

}
