export interface Provider {
    id: string;
    type: string;
    name: string;
    config?: any;
}

export interface ProfileConfig {
    name: string;
    icon?: string;
    settings: any;
    keybindings: any[];
    snippets: { [name: string]: any };
    extensions: string[];
}

export interface AppState {
    providers: Provider[];
    profiles: {
        default: ProfileConfig;
        custom: ProfileConfig[];
    } | null;
    syncing: boolean;
}

// Create a reactive state class using Runes
class StateStore {
    // Initialize with default values
    #state = $state<AppState>({
        providers: [],
        profiles: null, // Initialize as null to show loading state
        syncing: false
    });

    // Getter to access the reactive state
    get value() {
        return this.#state;
    }

    // Setter to replace the entire state
    set(newState: AppState) {
        this.#state = newState;
    }

    // Update method for partial updates
    update(updater: (s: AppState) => AppState) {
        this.#state = updater(this.#state);
    }
}

// Export a single instance
export const state = new StateStore();
