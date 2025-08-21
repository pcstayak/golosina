// Data Manager Module
class DataManager {
    constructor() {
        // Default exercise sets
        this.exerciseSets = [
            {
                id: 1,
                name: "Breathing Techniques",
                description: "Essential breathing exercises for vocal foundation",
                color: "#667eea",
                exercises: [
                    {
                        id: 1,
                        name: "Diaphragmatic Breathing",
                        description: "Place one hand on your chest and one on your stomach. Breathe in slowly through your nose, ensuring the hand on your stomach moves more than the one on your chest. This technique improves breath control and support."
                    },
                    {
                        id: 2,
                        name: "4-7-8 Breathing",
                        description: "Inhale for 4 counts, hold for 7 counts, exhale for 8 counts. This exercise helps with breath control and relaxation before vocal practice."
                    },
                    {
                        id: 3,
                        name: "Breath Holds",
                        description: "Take a deep breath and hold it while maintaining relaxed throat muscles. Practice extending the hold time gradually to build breath capacity."
                    }
                ]
            },
            {
                id: 2,
                name: "Voice Stability",
                description: "Exercises to develop consistent tone and pitch control",
                color: "#28a745",
                exercises: [
                    {
                        id: 4,
                        name: "Sustained Tones",
                        description: "Hold a single note for as long as possible with steady volume and pitch. Focus on maintaining consistent airflow and throat relaxation."
                    },
                    {
                        id: 5,
                        name: "Pitch Matching",
                        description: "Listen to a reference tone and match it exactly. Practice with different pitches across your vocal range to improve accuracy."
                    },
                    {
                        id: 6,
                        name: "Volume Control",
                        description: "Practice singing at different dynamic levels (pianissimo to fortissimo) while maintaining pitch and tone quality."
                    }
                ]
            },
            {
                id: 3,
                name: "Vocal Warm-ups",
                description: "Essential warm-up exercises to prepare your voice",
                color: "#fd7e14",
                exercises: [
                    {
                        id: 7,
                        name: "Lip Trills",
                        description: "Keep your lips relaxed and blow air through them while vocalizing, creating a motorboat sound. This helps warm up the vocal cords gently."
                    },
                    {
                        id: 8,
                        name: "Humming",
                        description: "Keep your mouth closed and create different pitches with 'mmm' sounds. Feel the vibrations in your face and chest area."
                    },
                    {
                        id: 9,
                        name: "Sirens",
                        description: "Start with your lowest comfortable pitch and slide smoothly to your highest, like a siren. Use 'ng' or 'nay' sounds."
                    }
                ]
            },
            {
                id: 4,
                name: "Articulation & Diction",
                description: "Exercises for clear pronunciation and articulation",
                color: "#dc3545",
                exercises: [
                    {
                        id: 10,
                        name: "Vowel Scales",
                        description: "Sing scales using pure vowel sounds (Ah, Eh, Ee, Oh, Oo). Focus on maintaining consistent tone and clear pronunciation throughout the range."
                    },
                    {
                        id: 11,
                        name: "Consonant Drills",
                        description: "Practice sharp consonants like P, B, T, D, K, G with clear articulation. Use repetitive patterns to build muscle memory."
                    },
                    {
                        id: 12,
                        name: "Tongue Twisters",
                        description: "Practice challenging tongue twisters to improve articulation speed and clarity. Start slowly and gradually increase tempo."
                    }
                ]
            }
        ];

        this.loadExerciseSetsFromStorage();
    }

    // Load exercise sets from localStorage
    loadExerciseSetsFromStorage() {
        const savedExerciseSets = localStorage.getItem('voiceSlicerExerciseSets');
        if (savedExerciseSets) {
            try {
                this.exerciseSets = JSON.parse(savedExerciseSets);
            } catch (error) {
                console.error('Error parsing saved exercise sets:', error);
            }
        }
    }

    // Helper function to get current exercises
    getCurrentExercises() {
        if (window.appState && window.appState.getIsSharedSession()) {
            console.log('Getting shared exercises:', window.appState.getSharedExercises());
            return window.appState.getSharedExercises() || [];
        }
        const currentSetIndex = window.appState ? window.appState.getCurrentSetIndex() : 0;
        const exercises = this.exerciseSets[currentSetIndex]?.exercises || [];
        console.log('Getting regular exercises:', exercises);
        return exercises;
    }

    // Helper function to get current set
    getCurrentSet() {
        const currentSetIndex = window.appState ? window.appState.getCurrentSetIndex() : 0;
        return this.exerciseSets[currentSetIndex];
    }

    // Get set recordings count
    getSetRecordingsCount(setId) {
        const set = this.exerciseSets.find(s => s.id === setId);
        if (!set) return 0;
        
        let count = 0;
        if (window.appState) {
            const currentSessionPieces = window.appState.getCurrentSessionPieces();
            set.exercises.forEach(exercise => {
                const exerciseKey = `exercise_${exercise.id}`;
                count += (currentSessionPieces[exerciseKey] || []).length;
            });
        }
        return count;
    }

    // Exercise management
    importExercises() {
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedExercises = JSON.parse(e.target.result);
                    if (Array.isArray(importedExercises) && this.validateExerciseSets(importedExercises)) {
                        this.exerciseSets = importedExercises;
                        if (window.appState) {
                            window.appState.setCurrentSetIndex(0);
                            window.appState.setCurrentExerciseIndex(0);
                        }
                        if (window.uiController) {
                            window.uiController.showLanding();
                        }
                        if (window.configSettings) {
                            window.configSettings.saveSettings();
                        }
                        this.showStatus('Exercise sets imported successfully!', 'success');
                    } else {
                        this.showStatus('Invalid exercise format', 'error');
                    }
                } catch (error) {
                    this.showStatus('Error reading file', 'error');
                }
            };
            reader.readAsText(file);
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

    exportExercises() {
        if (window.utilities) {
            const dataStr = JSON.stringify(this.exerciseSets, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const filename = `exercise_sets_${window.utilities.getCurrentDateString()}.json`;
            window.utilities.downloadFile(dataBlob, filename);
            this.showStatus('Exercise sets exported successfully!', 'success');
        }
    }

    createExample() {
        const exampleExercises = [
            {
                id: 1,
                name: "Custom Breathing Exercise",
                description: "A custom breathing exercise for improving vocal control..."
            },
            {
                id: 2,
                name: "Custom Scale Practice",
                description: "Practice scales with specific techniques..."
            }
        ];
        
        if (window.utilities) {
            const dataStr = JSON.stringify(exampleExercises, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const filename = `example_exercises_${window.utilities.getCurrentDateString()}.json`;
            window.utilities.downloadFile(dataBlob, filename);
            this.showStatus('Example file created successfully!', 'success');
        }
    }

    reloadExercises() {
        // In a full implementation, this would reload from a configured file path
        // For now, we'll just refresh the display
        if (window.uiController) {
            window.uiController.updateExerciseDisplay();
            window.uiController.updateNavigationButtons();
            window.uiController.updateExportButton();
        }
        this.showStatus('Exercises reloaded!', 'success');
    }

    // Getters and setters
    getExerciseSets() {
        return this.exerciseSets;
    }

    setExerciseSets(sets) {
        this.exerciseSets = sets;
    }

    getExerciseSet(index) {
        return this.exerciseSets[index];
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
window.DataManager = DataManager;