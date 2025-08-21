// UI Controller Module
class UIController {
    constructor() {}

    // Landing page functionality
    renderExerciseSets() {
        const setsGrid = document.getElementById('setsGrid');
        if (!setsGrid) return;

        setsGrid.innerHTML = '';
        const dataManager = window.dataManager;
        if (!dataManager) return;

        const exerciseSets = dataManager.getExerciseSets();
        exerciseSets.forEach((set, index) => {
            const recordingsCount = dataManager.getSetRecordingsCount(set.id);
            const setCard = document.createElement('div');
            setCard.className = 'exercise-set-card';
            setCard.style.borderLeftColor = set.color;
            setCard.onclick = () => this.selectExerciseSet(index);
            
            setCard.innerHTML = `
                <div class="set-header">
                    <h3 class="set-name">${set.name}</h3>
                    <p class="set-description">${set.description}</p>
                </div>
                <div class="set-stats">
                    <span class="lesson-count">${set.exercises.length} lessons</span>
                    <span class="recordings-count">${recordingsCount} recordings</span>
                </div>
            `;
            setsGrid.appendChild(setCard);
        });
    }

    selectExerciseSet(setIndex) {
        const appState = window.appState;
        if (!appState) return;

        appState.setCurrentSetIndex(setIndex);
        appState.setCurrentExerciseIndex(0);
        this.startNewSession();
        this.showLessons();
    }

    startNewSession() {
        const appState = window.appState;
        if (!appState) return;

        // Clear previous session data
        appState.clearCurrentSessionPieces();
        appState.setSessionActive(true);
        
        // Force update displays to show empty state immediately
        setTimeout(() => {
            this.updateAudioPiecesDisplay();
            this.updateExportButton();
        }, 50);
        
        if (window.configSettings) {
            window.configSettings.saveSettings();
        }
    }

    endSession() {
        if (confirm('Are you sure you want to end this session? All recordings from this session will be cleared.')) {
            const appState = window.appState;
            if (!appState) return;

            // Move current session pieces to permanent storage
            appState.mergeCurrentSessionToAudioPieces();
            
            // Clear session
            appState.clearCurrentSessionPieces();
            appState.setSessionActive(false);
            appState.setCurrentSetIndex(0);
            appState.setCurrentExerciseIndex(0);
            
            if (window.configSettings) {
                window.configSettings.saveSettings();
            }
            this.showLanding();
            this.showStatus('Session ended. Recordings have been saved.', 'success');
        }
    }

    showLanding() {
        document.getElementById('landingPage')?.classList.remove('hide');
        document.getElementById('lessonPage')?.classList.add('hide');
        document.getElementById('summaryPage')?.classList.remove('show');
        
        const appState = window.appState;
        if (appState) {
            appState.setCurrentView('landing');
        }
        this.renderExerciseSets();
    }

    abandonLesson() {
        if (confirm('Are you sure you want to abandon this lesson? All recordings from this session will be lost.')) {
            const appState = window.appState;
            if (!appState) return;

            // Clear all current session data
            appState.clearCurrentSessionPieces();
            appState.setSessionActive(false);
            
            // Stop recording if active
            const audioManager = window.audioManager;
            if (appState.getIsRecording() && audioManager) {
                audioManager.toggleRecording();
            }
            
            // Return to landing page
            this.showLanding();
            if (window.configSettings) {
                window.configSettings.saveSettings();
            }
        }
    }

    showLessons() {
        document.getElementById('landingPage')?.classList.add('hide');
        document.getElementById('lessonPage')?.classList.remove('hide');
        document.getElementById('summaryPage')?.classList.remove('show');
        
        const appState = window.appState;
        if (appState) {
            appState.setCurrentView('lesson');
        }
        this.updateExerciseDisplay();
        this.updateNavigationButtons();
    }

    // Exercise navigation
    updateExerciseDisplay() {
        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        const currentSet = dataManager.getCurrentSet();
        const exercises = dataManager.getCurrentExercises();
        const exercise = exercises[appState.getCurrentExerciseIndex()];
        
        if (!exercise) return;
        
        const exerciseTitle = document.getElementById('exerciseTitle');
        const exerciseDescription = document.getElementById('exerciseDescription');
        const exerciseCounter = document.getElementById('exerciseCounter');
        const setTitle = document.getElementById('setTitle');
        const setDescription = document.getElementById('setDescription');

        if (exerciseTitle) exerciseTitle.textContent = exercise.name;
        if (exerciseDescription) exerciseDescription.textContent = exercise.description;
        if (exerciseCounter) exerciseCounter.textContent = `${appState.getCurrentExerciseIndex() + 1} of ${exercises.length}`;
        
        // Update set header info
        const setHeaderInfo = document.querySelector('.set-header-info');
        if (setHeaderInfo && currentSet) {
            setHeaderInfo.style.setProperty('--set-color', currentSet.color);
        }
        
        // Update set title and description
        if (setTitle && currentSet) setTitle.textContent = currentSet.name;
        if (setDescription && currentSet) setDescription.textContent = currentSet.description;
        
        this.updateAudioPiecesDisplay();
        if (window.configSettings) {
            window.configSettings.saveSettings();
        }
    }

    // Summary page functionality
    showSummary() {
        document.getElementById('lessonPage')?.classList.add('hide');
        document.getElementById('summaryPage')?.classList.add('show');
        this.updateSummaryPage();
    }

    hideSummary() {
        document.getElementById('lessonPage')?.classList.remove('hide');
        document.getElementById('summaryPage')?.classList.remove('show');
    }

    updateSummaryPage() {
        this.updateSummaryStats();
        this.renderLessonSections();
        this.updateDownloadAllButton();
    }

    updateSummaryStats() {
        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        const currentSet = dataManager.getCurrentSet();
        if (!currentSet) return;
        
        let lessonsWithRecordings = 0;
        let totalRecordings = 0;
        const currentSessionPieces = appState.getCurrentSessionPieces();
        
        currentSet.exercises.forEach(exercise => {
            const exerciseKey = `exercise_${exercise.id}`;
            const count = (currentSessionPieces[exerciseKey] || []).length;
            if (count > 0) {
                lessonsWithRecordings++;
                totalRecordings += count;
            }
        });
        
        const totalLessonsEl = document.getElementById('totalLessons');
        const totalRecordingsEl = document.getElementById('totalRecordings');
        const totalDurationEl = document.getElementById('totalDuration');
        
        if (totalLessonsEl) totalLessonsEl.textContent = lessonsWithRecordings;
        if (totalRecordingsEl) totalRecordingsEl.textContent = totalRecordings;
        if (totalDurationEl) totalDurationEl.textContent = '0:00'; // Placeholder for duration calculation
    }

    renderLessonSections() {
        const summaryContent = document.getElementById('summaryContent');
        if (!summaryContent) return;

        summaryContent.innerHTML = '';

        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        // Show only current session from selected set
        const currentSet = dataManager.getCurrentSet();
        if (!currentSet) return;

        const setSection = document.createElement('div');
        setSection.innerHTML = `<h2 style="color: ${currentSet.color}; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid ${currentSet.color};">${currentSet.name} - Current Session</h2>`;
        summaryContent.appendChild(setSection);

        const currentSessionPieces = appState.getCurrentSessionPieces();
        currentSet.exercises.forEach(exercise => {
            const exerciseKey = `exercise_${exercise.id}`;
            const pieces = currentSessionPieces[exerciseKey] || [];
            
            const lessonSection = document.createElement('div');
            lessonSection.className = 'lesson-section';
            lessonSection.innerHTML = `
                <div class="lesson-header" onclick="toggleLessonSection(${exercise.id})" style="background: ${currentSet.color};">
                    <div>
                        <h3 class="lesson-title">${exercise.name}</h3>
                    </div>
                    <div class="lesson-meta">
                        <span>${pieces.length} recordings</span>
                        <span class="collapse-icon" id="icon-${exercise.id}">▼</span>
                    </div>
                </div>
                <div class="lesson-content" id="content-${exercise.id}">
                    <div class="lesson-pieces" id="pieces-${exercise.id}">
                        ${pieces.length === 0 ? 
                            '<div class="empty-lesson">No recordings for this lesson yet.</div>' :
                            pieces.map(piece => `
                                <div class="summary-piece">
                                    <div class="piece-info">
                                        <div class="piece-name-summary">${piece.name}</div>
                                        <div class="piece-timestamp">${new Date(piece.timestamp).toLocaleString()}</div>
                                    </div>
                                    <div class="piece-controls">
                                        <button class="piece-btn play-btn" onclick="playAudioPieceSummary('${piece.id}', '${exerciseKey}')" title="Play">▶</button>
                                        <button class="piece-btn download-btn" onclick="downloadSinglePiece('${piece.id}', '${exerciseKey}')" title="Download">📥</button>
                                        <button class="piece-btn delete-btn" onclick="deleteAudioPieceSummary('${piece.id}', '${exerciseKey}')" title="Delete">🗑</button>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `;
            summaryContent.appendChild(lessonSection);
        });
    }

    updateDownloadAllButton() {
        const downloadBtn = document.getElementById('downloadAllBtn');
        const appState = window.appState;
        if (!downloadBtn || !appState) return;

        const currentSessionPieces = appState.getCurrentSessionPieces();
        const totalPieces = Object.values(currentSessionPieces).reduce((total, pieces) => total + pieces.length, 0);
        
        downloadBtn.disabled = totalPieces === 0;
        downloadBtn.textContent = `📥 Download Session (${totalPieces} files)`;
    }

    updateNavigationButtons() {
        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        const exercises = dataManager.getCurrentExercises();
        const isLastLesson = appState.getCurrentExerciseIndex() === exercises.length - 1;
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const showSummaryBtn = document.getElementById('showSummaryBtn');

        if (prevBtn) prevBtn.disabled = appState.getCurrentExerciseIndex() === 0;
        if (nextBtn) nextBtn.disabled = isLastLesson;
        
        // Show Summary button only on last lesson
        if (showSummaryBtn) {
            showSummaryBtn.style.display = isLastLesson ? 'flex' : 'none';
        }
    }

    previousExercise() {
        const appState = window.appState;
        if (!appState) return;

        if (appState.getCurrentExerciseIndex() > 0) {
            appState.setCurrentExerciseIndex(appState.getCurrentExerciseIndex() - 1);
            this.updateExerciseDisplay();
            this.updateNavigationButtons();
        }
    }

    nextExercise() {
        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        const exercises = dataManager.getCurrentExercises();
        if (appState.getCurrentExerciseIndex() < exercises.length - 1) {
            appState.setCurrentExerciseIndex(appState.getCurrentExerciseIndex() + 1);
            this.updateExerciseDisplay();
            this.updateNavigationButtons();
        }
    }

    // Audio pieces management
    updateAudioPiecesDisplay() {
        const dataManager = window.dataManager;
        const appState = window.appState;
        if (!dataManager || !appState) return;

        const exercises = dataManager.getCurrentExercises();
        console.log('updateAudioPiecesDisplay - exercises:', exercises, 'currentIndex:', appState.getCurrentExerciseIndex());
        
        if (!exercises || exercises.length === 0 || !exercises[appState.getCurrentExerciseIndex()]) {
            console.warn('No exercise found at index:', appState.getCurrentExerciseIndex());
            return;
        }
        
        // Handle both regular exercises and shared lessons
        let exerciseKey, pieces;
        const currentExercise = exercises[appState.getCurrentExerciseIndex()];
        const exerciseId = String(currentExercise?.id || '');
        const currentSessionPieces = appState.getCurrentSessionPieces();
        
        console.log('Current exercise:', currentExercise, 'ID:', exerciseId);
        
        if (exerciseId.startsWith('shared_')) {
            // Find the matching shared exercise key
            const exerciseName = exercises[appState.getCurrentExerciseIndex()].name;
            exerciseKey = Object.keys(currentSessionPieces).find(key => 
                currentSessionPieces[key][0]?.exerciseName === exerciseName
            );
            pieces = exerciseKey ? currentSessionPieces[exerciseKey] || [] : [];
        } else {
            exerciseKey = `exercise_${exercises[appState.getCurrentExerciseIndex()].id}`;
            pieces = currentSessionPieces[exerciseKey] || [];
        }
        
        const container = document.getElementById('audioPieces');
        const emptyState = document.getElementById('emptyState');
        if (!container) return;
        
        if (pieces.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            container.querySelectorAll('.audio-piece').forEach(el => el.remove());
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        container.querySelectorAll('.audio-piece').forEach(el => el.remove());
        
        pieces.forEach((piece, index) => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'audio-piece';
            
            const isSharedPiece = piece.isShared;
            const pieceId = piece.id || `${exerciseKey}_${index}`;
            
            pieceElement.innerHTML = `
                <span class="piece-name">${piece.name}${isSharedPiece ? ' 🔗' : ''}</span>
                <div class="piece-controls">
                    <button class="piece-btn play-btn" onclick="playAudioPiece('${pieceId}', ${isSharedPiece})" title="Play">▶</button>
                    <button class="piece-btn download-btn" onclick="downloadSinglePieceFromLesson('${pieceId}', ${isSharedPiece})" title="Download">📥</button>
                    ${!isSharedPiece ? `<button class="piece-btn delete-btn" onclick="deleteAudioPiece('${pieceId}')" title="Delete">🗑</button>` : ''}
                </div>
            `;
            container.appendChild(pieceElement);
        });
    }

    // Update export button state based on available recordings
    updateExportButton() {
        const exportBtn = document.getElementById('downloadAllBtn');
        const appState = window.appState;
        if (!exportBtn || !appState) return;

        const currentSessionPieces = appState.getCurrentSessionPieces();
        const totalPieces = Object.values(currentSessionPieces).reduce((total, pieces) => total + pieces.length, 0);
        exportBtn.disabled = totalPieces === 0;
    }

    // Status display
    showStatus(message, type = 'info') {
        const statusDisplay = document.getElementById('statusDisplay');
        if (!statusDisplay) return;

        statusDisplay.textContent = message;
        
        statusDisplay.className = 'status-display';
        if (type === 'error') {
            statusDisplay.classList.add('status-recording');
        } else if (type === 'processing') {
            statusDisplay.classList.add('status-processing');
        } else if (type === 'success') {
            statusDisplay.style.color = '#27ae60';
        }

        if (type !== 'processing') {
            setTimeout(() => {
                statusDisplay.textContent = 'Ready to record';
                statusDisplay.className = 'status-display status-idle';
            }, 3000);
        }
    }

    // Share result display
    showShareResult(shareUrl) {
        const shareResult = document.getElementById('shareResult');
        const shareLink = document.getElementById('shareLink');
        
        if (shareLink) shareLink.value = shareUrl;
        if (shareResult) shareResult.style.display = 'block';
    }

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.select();
            document.execCommand('copy');
            this.showStatus('Share link copied to clipboard!', 'success');
        }
    }
}

// Export singleton instance
window.UIController = UIController;