export var OogyCutscene;
(function (OogyCutscene) {
    let OogyCutsceneTaskAnimationKind;
    (function (OogyCutsceneTaskAnimationKind) {
        OogyCutsceneTaskAnimationKind["none"] = "none";
        OogyCutsceneTaskAnimationKind["fadeIn"] = "fadeIn";
    })(OogyCutsceneTaskAnimationKind = OogyCutscene.OogyCutsceneTaskAnimationKind || (OogyCutscene.OogyCutsceneTaskAnimationKind = {}));
    OogyCutscene.kOogyCutsceneTaskOptionsDefault = {
        shouldClearExistingText: true,
        durationPerLetter: 50,
        waitAfterLetter: 25,
        animationKind: OogyCutsceneTaskAnimationKind.none,
        blockingCompletionAction: async () => {
            await new Promise((resolve, reject) => setTimeout(resolve, 200));
        }
    };
    class OogyCutscenePerformer {
        constructor() {
            this._activeTasks = new Map();
            this.isPaused = false;
            this.pausedLetterIndex = undefined;
        }
        get activeTasks() {
            return Array.from(this._activeTasks.values());
        }
        async perform(task) {
            if (task === undefined) {
                if (this._activeTasks.size < 1) {
                    throw new Error("OogyCutscenePerformer: asked to perform with no task given, and no activeTasks queued. This is not a proper use of the API.");
                }
                const enqueuedUUIDs = Array.from(this._activeTasks.keys());
                const nextUUID = enqueuedUUIDs[0];
                const nextTask = this._activeTasks.get(nextUUID);
                await this.performEnqueuedTask(nextTask, nextUUID);
                return;
            }
            const uuid = this.generateUUID();
            this._activeTasks.set(uuid, task);
            if (this._activeTasks.size > 1) {
                return;
            }
            await this.performEnqueuedTask(task, uuid);
        }
        async performEnqueuedTask(task, uuid) {
            const element = task.element;
            const options = task.options !== undefined ? task.options : OogyCutscene.kOogyCutsceneTaskOptionsDefault;
            if (options.shouldClearExistingText === true) {
                element.textContent = '';
            }
            if (task.text !== undefined) {
                const letters = task.text.split("");
                const letterAnimDuration = options.durationPerLetter;
                const letterAnimKind = options.animationKind;
                const letterAnimWaitAfter = options.waitAfterLetter;
                const letterStartingIdx = this.pausedLetterIndex !== undefined ? this.pausedLetterIndex : 0;
                if (letterStartingIdx >= letters.length) {
                    await this.wait(letterAnimWaitAfter);
                }
                else {
                    for (let i = letterStartingIdx; i < letters.length; i++) {
                        const letter = letters[i];
                        if (this.isPaused === true) {
                            this.pausedLetterIndex = i;
                            return;
                        }
                        const letterAnimationOpts = {
                            letter,
                            element,
                            duration: letterAnimDuration,
                            kind: letterAnimKind
                        };
                        this.animateLetter(letterAnimationOpts);
                        await this.wait(letterAnimWaitAfter);
                    }
                }
            }
            if (options.blockingCompletionAction !== undefined) {
                await options.blockingCompletionAction();
            }
            this._activeTasks.delete(uuid);
            if (this._activeTasks.size > 0) {
                await this.perform();
            }
        }
        generateUUID() {
            return window.crypto.randomUUID();
        }
        async wait(duration) {
            await new Promise((resolve, reject) => { setTimeout(resolve, duration); });
        }
        animateLetter(options) {
            const element = options.element;
            const letter = options.letter;
            if (options.kind === OogyCutsceneTaskAnimationKind.none) {
                element.textContent += letter;
            }
            else {
                const animationSpan = document.createElement('span');
                animationSpan.textContent = letter;
                animationSpan.style.transition = 'all 1s ease-in-out';
                element.appendChild(animationSpan);
            }
        }
        async batch(tasks) {
            for (let task of tasks) {
                const uuid = this.generateUUID();
                this._activeTasks.set(uuid, task);
            }
            await this.perform();
        }
        pause() {
            this.isPaused = true;
        }
        async unpause() {
            this.isPaused = false;
            if (this.pausedLetterIndex !== undefined) {
                await this.perform();
            }
        }
    }
    OogyCutscene.OogyCutscenePerformer = OogyCutscenePerformer;
})(OogyCutscene || (OogyCutscene = {}));
