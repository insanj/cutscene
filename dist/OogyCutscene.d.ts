export declare module OogyCutscene {
    interface OogyCutsceneAPI {
        readonly activeTasks: OogyCutsceneTask[];
        perform(task?: OogyCutsceneTask): Promise<void>;
        batch(tasks?: OogyCutsceneTask[]): Promise<void>;
        pause(): void;
        unpause(): Promise<void>;
    }
    type OogyCutsceneTask = {
        element: Element;
        text?: string;
        options?: OogyCutsceneTaskOptions;
    };
    type OogyCutsceneTaskOptions = {
        shouldClearExistingText: boolean;
        durationPerLetter: number;
        waitAfterLetter: number;
        animationKind: OogyCutsceneTaskAnimationKind;
        blockingCompletionAction?: () => Promise<void>;
    };
    enum OogyCutsceneTaskAnimationKind {
        none = "none",
        fadeIn = "fadeIn"
    }
    const kOogyCutsceneTaskOptionsDefault: OogyCutsceneTaskOptions;
    class OogyCutscenePerformer implements OogyCutsceneAPI {
        get activeTasks(): OogyCutsceneTask[];
        private _activeTasks;
        private isPaused;
        private pausedLetterIndex;
        perform(task?: OogyCutsceneTask): Promise<void>;
        private performEnqueuedTask;
        private generateUUID;
        private wait;
        private animateLetter;
        batch(tasks: OogyCutsceneTask[]): Promise<void>;
        pause(): void;
        unpause(): Promise<void>;
    }
}
