// Configuration and Settings Module
class ConfigSettings {
    constructor() {
        // Default settings
        this.settings = {
            microphoneId: '',
            sampleRate: 44100,
            silenceThreshold: 0.01,
            silenceDuration: 0.5
        };

        // Supabase configuration
        this.supabase = null;
        this.SUPABASE_URL = 'https://cansvchorbzeqenctscc.supabase.co/';
        this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbnN2Y2hvcmJ6ZXFlbmN0c2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDY1MjAsImV4cCI6MjA3MTEyMjUyMH0.1_kHpqy0RROOAOT1tA5YWIPgKI3ZZSvomD6srrOok5I';
    }

    // Initialize Supabase
    initSupabase() {
        if (!this.supabase) {
            try {
                this.supabase = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
            } catch (error) {
                console.error('Failed to initialize Supabase:', error);
                this.showStatus('Supabase configuration error. Please check settings.', 'error');
            }
        }
        return this.supabase;
    }

    // Settings management
    loadSettings() {
        const savedSettings = localStorage.getItem('voiceSlicerSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        const savedPieces = localStorage.getItem('voiceSlicerPieces');
        if (savedPieces && window.appState) {
            window.appState.setAudioPieces(JSON.parse(savedPieces));
        }

        const savedSetIndex = localStorage.getItem('voiceSlicerCurrentSetIndex');
        if (savedSetIndex !== null && window.appState) {
            window.appState.setCurrentSetIndex(parseInt(savedSetIndex));
        }

        const savedExerciseIndex = localStorage.getItem('voiceSlicerCurrentExerciseIndex');
        if (savedExerciseIndex !== null && window.appState) {
            window.appState.setCurrentExerciseIndex(parseInt(savedExerciseIndex));
        }

        this.updateSettingsUI();
    }

    saveSettings() {
        localStorage.setItem('voiceSlicerSettings', JSON.stringify(this.settings));
        if (window.appState) {
            localStorage.setItem('voiceSlicerPieces', JSON.stringify(window.appState.getAudioPieces()));
            localStorage.setItem('voiceSlicerCurrentSetIndex', window.appState.getCurrentSetIndex().toString());
            localStorage.setItem('voiceSlicerCurrentExerciseIndex', window.appState.getCurrentExerciseIndex().toString());
        }
        if (window.dataManager) {
            localStorage.setItem('voiceSlicerExerciseSets', JSON.stringify(window.dataManager.getExerciseSets()));
        }
    }

    updateSettingsUI() {
        const sampleRateSelect = document.getElementById('sampleRateSelect');
        const silenceThreshold = document.getElementById('silenceThreshold');
        const silenceDuration = document.getElementById('silenceDuration');
        const thresholdValue = document.getElementById('thresholdValue');
        const durationValue = document.getElementById('durationValue');

        if (sampleRateSelect) sampleRateSelect.value = this.settings.sampleRate;
        if (silenceThreshold) silenceThreshold.value = this.settings.silenceThreshold;
        if (silenceDuration) silenceDuration.value = this.settings.silenceDuration;
        if (thresholdValue) thresholdValue.textContent = this.settings.silenceThreshold;
        if (durationValue) durationValue.textContent = this.settings.silenceDuration + 's';
        
        // Load current exercise sets into JSON editor
        this.loadJsonEditor();
    }

    // JSON Editor functions
    loadJsonEditor() {
        const editor = document.getElementById('jsonEditor');
        if (editor && window.dataManager) {
            editor.value = JSON.stringify(window.dataManager.getExerciseSets(), null, 2);
            editor.classList.remove('error');
            this.showStatus('Current exercise sets loaded into editor', 'success');
        }
    }

    saveFromJsonEditor() {
        const editor = document.getElementById('jsonEditor');
        if (!editor) return;

        const jsonText = editor.value.trim();
        
        if (!jsonText) {
            this.showStatus('Please enter JSON data first', 'error');
            return;
        }
        
        try {
            const parsedSets = JSON.parse(jsonText);
            if (Array.isArray(parsedSets) && this.validateExerciseSets(parsedSets)) {
                if (window.dataManager) {
                    window.dataManager.setExerciseSets(parsedSets);
                    window.appState.setCurrentSetIndex(0);
                    window.appState.setCurrentExerciseIndex(0);
                    editor.classList.remove('error');
                    if (window.uiController) {
                        window.uiController.showLanding();
                    }
                    this.saveSettings();
                    this.showStatus('Exercise sets updated from editor!', 'success');
                }
            } else {
                editor.classList.add('error');
                this.showStatus('Invalid exercise sets format', 'error');
            }
        } catch (error) {
            editor.classList.add('error');
            this.showStatus('Invalid JSON syntax: ' + error.message, 'error');
        }
    }

    formatJson() {
        const editor = document.getElementById('jsonEditor');
        if (!editor) return;

        const jsonText = editor.value.trim();
        
        if (!jsonText) {
            this.showStatus('Please enter JSON data first', 'error');
            return;
        }
        
        try {
            const parsed = JSON.parse(jsonText);
            editor.value = JSON.stringify(parsed, null, 2);
            editor.classList.remove('error');
            this.showStatus('JSON formatted successfully', 'success');
        } catch (error) {
            editor.classList.add('error');
            this.showStatus('Cannot format invalid JSON: ' + error.message, 'error');
        }
    }

    validateExerciseSets(setsArray) {
        return setsArray.every(set => 
            set.hasOwnProperty('id') && 
            set.hasOwnProperty('name') && 
            set.hasOwnProperty('description') &&
            set.hasOwnProperty('color') &&
            set.hasOwnProperty('exercises') &&
            Array.isArray(set.exercises) &&
            set.exercises.every(ex => 
                ex.hasOwnProperty('id') && 
                ex.hasOwnProperty('name') && 
                ex.hasOwnProperty('description')
            )
        );
    }

    // Settings modal
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('show');
            this.updateSettingsUI();
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('show');
            this.saveSettings();
        }
    }

    // Getters
    getSettings() {
        return this.settings;
    }

    getSetting(key) {
        return this.settings[key];
    }

    // Setters
    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    // Utility method for showing status (will be replaced with proper reference)
    showStatus(message, type = 'info') {
        if (window.uiController && window.uiController.showStatus) {
            window.uiController.showStatus(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Export singleton instance
window.ConfigSettings = ConfigSettings;