// Event Handler Module
class EventHandler {
    constructor() {}

    // Setup all event listeners
    setupEventListeners() {
        this.setupSettingsEventListeners();
        this.setupModalEventListeners();
        this.setupKeyboardShortcuts();
        this.setupCleanupListeners();
    }

    // Settings event listeners
    setupSettingsEventListeners() {
        const microphoneSelect = document.getElementById('microphoneSelect');
        if (microphoneSelect) {
            microphoneSelect.addEventListener('change', (e) => {
                if (window.configSettings) {
                    window.configSettings.setSetting('microphoneId', e.target.value);
                }
            });
        }

        const sampleRateSelect = document.getElementById('sampleRateSelect');
        if (sampleRateSelect) {
            sampleRateSelect.addEventListener('change', (e) => {
                if (window.configSettings) {
                    window.configSettings.setSetting('sampleRate', parseInt(e.target.value));
                }
            });
        }

        const silenceThreshold = document.getElementById('silenceThreshold');
        if (silenceThreshold) {
            silenceThreshold.addEventListener('input', (e) => {
                if (window.configSettings) {
                    window.configSettings.setSetting('silenceThreshold', parseFloat(e.target.value));
                    const thresholdValue = document.getElementById('thresholdValue');
                    if (thresholdValue) thresholdValue.textContent = e.target.value;
                }
            });
        }

        const silenceDuration = document.getElementById('silenceDuration');
        if (silenceDuration) {
            silenceDuration.addEventListener('input', (e) => {
                if (window.configSettings) {
                    window.configSettings.setSetting('silenceDuration', parseFloat(e.target.value));
                    const durationValue = document.getElementById('durationValue');
                    if (durationValue) durationValue.textContent = e.target.value + 's';
                }
            });
        }

        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                if (window.dataManager) {
                    window.dataManager.handleFileImport(e);
                }
            });
        }
    }

    // Modal event listeners
    setupModalEventListeners() {
        // Close modal when clicking outside
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    if (window.configSettings) {
                        window.configSettings.closeSettings();
                    }
                }
            });
        }
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const appState = window.appState;
            const uiController = window.uiController;
            const audioManager = window.audioManager;
            const configSettings = window.configSettings;
            
            if (!appState) return;

            const isSummaryVisible = document.getElementById('summaryPage')?.classList.contains('show');
            
            if (e.key === 'ArrowLeft' && !e.target.matches('input, select, textarea')) {
                if (!isSummaryVisible && uiController) {
                    uiController.previousExercise();
                }
            } else if (e.key === 'ArrowRight' && !e.target.matches('input, select, textarea')) {
                if (!isSummaryVisible && uiController) {
                    uiController.nextExercise();
                }
            } else if (e.key === ' ' && !e.target.matches('input, select, textarea')) {
                e.preventDefault();
                if (!isSummaryVisible && audioManager) {
                    audioManager.toggleRecording();
                }
            } else if (e.key === 'Escape') {
                if (isSummaryVisible && uiController) {
                    uiController.hideSummary();
                } else if (configSettings) {
                    configSettings.closeSettings();
                }
            } else if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                if (isSummaryVisible && uiController) {
                    uiController.hideSummary();
                } else if (uiController) {
                    uiController.showSummary();
                }
            }
        });
    }

    // Cleanup event listeners
    setupCleanupListeners() {
        // Add cleanup listeners
        window.addEventListener('beforeunload', () => {
            if (window.audioManager) {
                window.audioManager.cleanupAudioResources();
            }
        });
        
        window.addEventListener('pagehide', () => {
            if (window.audioManager) {
                window.audioManager.cleanupAudioResources();
            }
        });
    }

    // Global function wrappers for HTML onclick handlers
    setupGlobalFunctionWrappers() {
        // Navigation functions
        window.previousExercise = () => {
            if (window.uiController) {
                window.uiController.previousExercise();
            }
        };

        window.nextExercise = () => {
            if (window.uiController) {
                window.uiController.nextExercise();
            }
        };

        // Recording functions
        window.toggleRecording = () => {
            if (window.audioManager) {
                window.audioManager.toggleRecording();
            }
        };

        window.testRecord = () => {
            if (window.audioManager) {
                window.audioManager.testRecord();
            }
        };

        // UI functions
        window.showSummary = () => {
            if (window.uiController) {
                window.uiController.showSummary();
            }
        };

        window.hideSummary = () => {
            if (window.uiController) {
                window.uiController.hideSummary();
            }
        };

        window.showLanding = () => {
            if (window.uiController) {
                window.uiController.showLanding();
            }
        };

        window.abandonLesson = () => {
            if (window.uiController) {
                window.uiController.abandonLesson();
            }
        };

        window.endSession = () => {
            if (window.uiController) {
                window.uiController.endSession();
            }
        };

        // Settings functions
        window.openSettings = () => {
            if (window.configSettings) {
                window.configSettings.openSettings();
            }
        };

        window.closeSettings = () => {
            if (window.configSettings) {
                window.configSettings.closeSettings();
            }
        };

        // Audio piece functions
        window.playAudioPiece = (pieceId, isShared = false) => {
            console.log('🎵 Playing audio piece:', pieceId, 'isShared:', isShared);
            
            const appState = window.appState;
            if (!appState) return;

            // Find the piece in current session pieces
            let piece = null;
            const currentSessionPieces = appState.getCurrentSessionPieces();
            for (const key in currentSessionPieces) {
                const pieces = currentSessionPieces[key] || [];
                piece = pieces.find(p => (p.id || `${key}_${pieces.indexOf(p)}`) === pieceId);
                if (piece) {
                    console.log('Found piece:', piece);
                    break;
                }
            }
            
            if (!piece) {
                if (window.uiController) {
                    window.uiController.showStatus('Audio piece not found', 'error');
                }
                return;
            }
            
            let audioSrc;
            
            if (piece.audioData) {
                // Priority 1: Use blob data (works for both shared and local)
                console.log('Using blob data for audio playback');
                audioSrc = URL.createObjectURL(piece.audioData);
            } else if (piece.url) {
                // Priority 2: Use URL (fallback for shared pieces)
                console.log('Using URL for audio playback:', piece.url);
                audioSrc = piece.url;
            } else {
                console.error('No audio data or URL available for piece:', piece);
                if (window.uiController) {
                    window.uiController.showStatus('Error: Audio data not available', 'error');
                }
                return;
            }
            
            console.log('Audio source:', audioSrc);
            
            const audio = new Audio();
            
            // Add error handling
            audio.onerror = (error) => {
                console.error('Audio load error:', error);
                console.error('Audio error code:', audio.error?.code, audio.error?.message);
                if (window.uiController) {
                    window.uiController.showStatus(`Audio load error: ${audio.error?.message || 'Unknown error'}`, 'error');
                }
            };
            
            audio.onloadstart = () => {
                console.log('Audio loading started...');
                if (window.uiController) {
                    window.uiController.showStatus('Loading audio...', 'processing');
                }
            };
            
            audio.oncanplay = () => {
                console.log('Audio can start playing');
                if (window.uiController) {
                    window.uiController.showStatus('Playing audio...', 'success');
                }
            };
            
            // Set the source and try to play
            audio.src = audioSrc;
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
                if (window.uiController) {
                    window.uiController.showStatus(`Playback error: ${error.message}`, 'error');
                }
            });
        };

        window.deleteAudioPiece = (pieceId) => {
            if (confirm('Are you sure you want to delete this audio piece?')) {
                const dataManager = window.dataManager;
                const appState = window.appState;
                const uiController = window.uiController;
                
                if (!dataManager || !appState) return;

                const exercises = dataManager.getCurrentExercises();
                if (!exercises[appState.getCurrentExerciseIndex()]) return;
                
                const exerciseKey = `exercise_${exercises[appState.getCurrentExerciseIndex()].id}`;
                appState.removeCurrentSessionPiece(exerciseKey, pieceId);
                
                if (uiController) {
                    uiController.updateAudioPiecesDisplay();
                    uiController.updateExportButton();
                    uiController.showStatus('Audio piece deleted', 'success');
                }
                if (window.configSettings) {
                    window.configSettings.saveSettings();
                }
            }
        };

        // Download functions
        window.downloadSinglePieceFromLesson = (pieceId, isShared = false) => {
            if (window.exportSharing) {
                window.exportSharing.downloadSinglePieceFromLesson(pieceId);
            }
        };

        window.downloadSinglePiece = (pieceId, exerciseKey) => {
            if (window.exportSharing) {
                window.exportSharing.downloadSinglePiece(pieceId, exerciseKey);
            }
        };

        window.downloadAllPieces = () => {
            if (window.exportSharing) {
                window.exportSharing.exportLesson();
            }
        };

        // Export/import functions
        window.exportLesson = () => {
            if (window.exportSharing) {
                window.exportSharing.exportLesson();
            }
        };

        window.importExercises = () => {
            if (window.dataManager) {
                window.dataManager.importExercises();
            }
        };

        window.exportExercises = () => {
            if (window.dataManager) {
                window.dataManager.exportExercises();
            }
        };

        window.createExample = () => {
            if (window.dataManager) {
                window.dataManager.createExample();
            }
        };

        window.reloadExercises = () => {
            if (window.dataManager) {
                window.dataManager.reloadExercises();
            }
        };

        // JSON editor functions
        window.loadJsonEditor = () => {
            if (window.configSettings) {
                window.configSettings.loadJsonEditor();
            }
        };

        window.saveFromJsonEditor = () => {
            if (window.configSettings) {
                window.configSettings.saveFromJsonEditor();
            }
        };

        window.formatJson = () => {
            if (window.configSettings) {
                window.configSettings.formatJson();
            }
        };

        // Summary functions
        window.toggleLessonSection = (exerciseId) => {
            // Find the section by exercise ID more reliably
            const sections = document.querySelectorAll('.lesson-section');
            let targetSection = null;
            
            sections.forEach(section => {
                const header = section.querySelector('.lesson-header');
                if (header && header.onclick.toString().includes(exerciseId)) {
                    targetSection = section;
                }
            });
            
            if (targetSection) {
                const icon = document.getElementById(`icon-${exerciseId}`);
                if (icon) {
                    targetSection.classList.toggle('collapsed');
                    icon.textContent = targetSection.classList.contains('collapsed') ? '▶' : '▼';
                }
            }
        };

        window.playAudioPieceSummary = (pieceId, exerciseKey) => {
            if (window.exportSharing) {
                window.exportSharing.playAudioPieceSummary(pieceId, exerciseKey);
            }
        };

        window.deleteAudioPieceSummary = (pieceId, exerciseKey) => {
            if (window.exportSharing) {
                window.exportSharing.deleteAudioPieceSummary(pieceId, exerciseKey);
            }
        };

        // Sharing functions
        window.shareLesson = () => {
            if (window.exportSharing) {
                window.exportSharing.shareLesson();
            }
        };

        window.copyShareLink = () => {
            if (window.uiController) {
                window.uiController.copyShareLink();
            }
        };
    }
}

// Export singleton instance
window.EventHandler = EventHandler;