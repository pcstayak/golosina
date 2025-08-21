// Audio Management Module
class AudioManager {
    constructor() {
        this.audioContext = null;
    }

    // Audio device initialization
    async initializeAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            const select = document.getElementById('microphoneSelect');
            if (select) {
                select.innerHTML = '<option value="">Default microphone</option>';
                
                audioInputs.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${device.deviceId.substr(0, 8)}`;
                    select.appendChild(option);
                });

                const settings = window.configSettings ? window.configSettings.getSettings() : {};
                if (settings.microphoneId) {
                    select.value = settings.microphoneId;
                }
            }
        } catch (error) {
            console.error('Error enumerating audio devices:', error);
        }
    }

    // Check and request microphone permission
    async ensureMicrophonePermission() {
        const appState = window.appState;
        if (!appState) return null;

        if (appState.getMicrophonePermissionGranted() && appState.getAudioStream() && appState.getAudioStream().active) {
            return appState.getAudioStream(); // Already have permission and active stream
        }

        try {
            // Check if we have permission without requesting it first
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                if (permission.state === 'denied') {
                    throw new Error('Microphone permission denied');
                }
            }

            const utilities = window.utilities;
            if (!utilities) throw new Error('Utilities not available');

            // Check if HTTPS is required (only for mobile browsers)
            if (utilities.requiresHTTPS()) {
                throw new Error('Audio recording requires HTTPS on mobile devices. Please access this page via HTTPS.');
            }

            const isMobile = utilities.isMobileDevice();
            const settings = window.configSettings ? window.configSettings.getSettings() : {};

            // Request microphone access
            const constraints = isMobile 
                ? utilities.getMobileAudioConstraints()
                : utilities.getDesktopAudioConstraints(settings.microphoneId, settings.sampleRate);

            console.log('🔧 Audio constraints:', constraints);
            
            let audioStream;
            try {
                audioStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Got audio stream:', audioStream);
            } catch (getUserMediaError) {
                console.warn('❌ Enhanced constraints failed, trying basic audio...', getUserMediaError);
                // Fallback to most basic audio constraints
                audioStream = await navigator.mediaDevices.getUserMedia(utilities.getBasicAudioConstraints());
                console.log('✅ Got audio stream with basic constraints:', audioStream);
            }

            appState.setAudioStream(audioStream);
            appState.setMicrophonePermissionGranted(true);
            console.log('✅ Microphone permission granted and cached');
            return audioStream;

        } catch (error) {
            appState.setMicrophonePermissionGranted(false);
            console.error('❌ Failed to get microphone permission:', error);
            throw error;
        }
    }

    // Recording functionality
    async toggleRecording() {
        const appState = window.appState;
        if (!appState) return;

        if (!appState.getIsRecording()) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        const appState = window.appState;
        if (!appState) return;

        try {
            console.log('🎤 Starting recording process...');
            
            const utilities = window.utilities;
            if (!utilities) throw new Error('Utilities not available');

            // Check device type for mobile-specific handling
            const isMobile = utilities.isMobileDevice();
            console.log(`📱 Device detected: ${isMobile ? 'Mobile' : 'Desktop'}`);
            
            // Use cached permission and stream
            const audioStream = await this.ensureMicrophonePermission();
            
            // Use mobile-compatible MediaRecorder options
            const mediaRecorderOptions = utilities.getMediaRecorderOptions();
            
            console.log('🔴 Creating MediaRecorder with options:', mediaRecorderOptions);
            const mediaRecorder = new MediaRecorder(audioStream, mediaRecorderOptions);
            console.log('✅ MediaRecorder created successfully');
            
            appState.setMediaRecorder(mediaRecorder);
            appState.clearRecordedChunks();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    appState.addRecordedChunk(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('⏹️ Recording stopped, processing...');
                this.processRecording();
            };

            console.log('▶️ Starting MediaRecorder...');
            mediaRecorder.start();
            console.log('✅ MediaRecorder started successfully');
            
            appState.setIsRecording(true);
            this.updateRecordingUI();
            console.log('🎤 Recording is now active!');
        } catch (error) {
            console.error('Error starting recording:', error);
            
            const utilities = window.utilities;
            const errorMessage = utilities ? utilities.getRecordingErrorMessage(error) : 'Error starting recording';
            
            console.log('Detailed error info:', {
                name: error.name,
                message: error.message,
                isMobile: utilities ? utilities.isMobileDevice() : false,
                isHTTPS: location.protocol === 'https:',
                userAgent: navigator.userAgent
            });
            
            this.showStatus(errorMessage, 'error');
        }
    }

    stopRecording() {
        const appState = window.appState;
        if (!appState) return;

        const mediaRecorder = appState.getMediaRecorder();
        if (mediaRecorder && appState.getIsRecording()) {
            mediaRecorder.stop();
            // Don't stop the audio stream tracks - keep them alive for permission caching
            appState.setIsRecording(false);
            this.updateRecordingUI();
        }
    }

    updateRecordingUI() {
        const appState = window.appState;
        if (!appState) return;

        const recordBtn = document.getElementById('recordBtn');
        const statusDisplay = document.getElementById('statusDisplay');
        
        if (appState.getIsRecording()) {
            if (recordBtn) {
                recordBtn.textContent = '⏹';
                recordBtn.className = 'record-btn recording';
            }
            if (statusDisplay) {
                statusDisplay.textContent = 'Recording in progress...';
                statusDisplay.className = 'status-display status-recording';
            }
        } else {
            if (recordBtn) {
                recordBtn.textContent = '🎤';
                recordBtn.className = 'record-btn';
            }
            if (statusDisplay) {
                statusDisplay.textContent = 'Ready to record';
                statusDisplay.className = 'status-display status-idle';
            }
        }
    }

    // Audio processing
    async processRecording() {
        this.showStatus('Processing recording...', 'processing');
        
        try {
            const appState = window.appState;
            const utilities = window.utilities;
            if (!appState || !utilities) throw new Error('Dependencies not available');

            // Create blob with the correct MIME type based on what was recorded
            const isMobile = utilities.isMobileDevice();
            let blobType = 'audio/wav';
            const mediaRecorder = appState.getMediaRecorder();
            if (isMobile && mediaRecorder && mediaRecorder.mimeType) {
                blobType = mediaRecorder.mimeType;
            }
            
            const audioBlob = new Blob(appState.getRecordedChunks(), { type: blobType });
            const audioBuffer = await audioBlob.arrayBuffer();
            
            const settings = window.configSettings ? window.configSettings.getSettings() : { sampleRate: 44100 };
            
            // Create audio context with mobile compatibility
            const audioContext = await utilities.createAudioContext(isMobile ? 44100 : settings.sampleRate);
            const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
            
            const pieces = await this.splitAudioBySilence(decodedAudio, audioContext);
            const dataManager = window.dataManager;
            if (!dataManager) throw new Error('DataManager not available');

            const exercises = dataManager.getCurrentExercises();
            const exerciseKey = `exercise_${exercises[appState.getCurrentExerciseIndex()].id}`;

            pieces.forEach((piece, index) => {
                const currentSessionPieces = appState.getCurrentSessionPieces();
                const currentSessionCount = (currentSessionPieces[exerciseKey] || []).length;
                const pieceData = {
                    id: `${exerciseKey}_${Date.now()}_${index}`,
                    name: `${exercises[appState.getCurrentExerciseIndex()].name}_${utilities.getCurrentDateString()}_piece${currentSessionCount + index + 1}`,
                    audioData: piece,
                    timestamp: new Date().toISOString()
                };
                appState.addCurrentSessionPiece(exerciseKey, pieceData);
            });

            if (window.uiController) {
                window.uiController.updateAudioPiecesDisplay();
                window.uiController.updateExportButton();
            }
            if (window.configSettings) {
                window.configSettings.saveSettings();
            }
            this.showStatus(`Recording processed! Created ${pieces.length} audio pieces.`, 'success');
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showStatus('Error processing recording', 'error');
        }
    }

    async splitAudioBySilence(audioBuffer, audioContext) {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const settings = window.configSettings ? window.configSettings.getSettings() : { silenceThreshold: 0.01, silenceDuration: 0.5 };
        const threshold = settings.silenceThreshold;
        const minSilenceDuration = settings.silenceDuration;
        const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);
        
        let pieces = [];
        let currentPieceStart = 0;
        let silenceStart = -1;
        let inSilence = false;

        for (let i = 0; i < channelData.length; i++) {
            const amplitude = Math.abs(channelData[i]);
            
            if (amplitude < threshold) {
                if (!inSilence) {
                    silenceStart = i;
                    inSilence = true;
                }
            } else {
                if (inSilence && (i - silenceStart) >= minSilenceSamples) {
                    if (currentPieceStart < silenceStart) {
                        const pieceLength = silenceStart - currentPieceStart;
                        const pieceBuffer = audioContext.createBuffer(1, pieceLength, sampleRate);
                        const pieceData = pieceBuffer.getChannelData(0);
                        
                        for (let j = 0; j < pieceLength; j++) {
                            pieceData[j] = channelData[currentPieceStart + j];
                        }
                        
                        const utilities = window.utilities;
                        if (utilities) {
                            pieces.push(await utilities.audioBufferToBlob(pieceBuffer));
                        }
                    }
                    currentPieceStart = i;
                }
                inSilence = false;
            }
        }

        if (currentPieceStart < channelData.length) {
            const pieceLength = channelData.length - currentPieceStart;
            const pieceBuffer = audioContext.createBuffer(1, pieceLength, sampleRate);
            const pieceData = pieceBuffer.getChannelData(0);
            
            for (let j = 0; j < pieceLength; j++) {
                pieceData[j] = channelData[currentPieceStart + j];
            }
            
            const utilities = window.utilities;
            if (utilities) {
                pieces.push(await utilities.audioBufferToBlob(pieceBuffer));
            }
        }

        return pieces.length > 0 ? pieces : [new Blob([audioBuffer], { type: 'audio/wav' })];
    }

    // Test recording functionality
    async testRecord() {
        const testBtn = document.getElementById('testRecordBtn');
        const testStatus = document.getElementById('testStatus');
        
        if (!testBtn || !testStatus) return;

        if (testBtn.textContent === '🎤 Test Record') {
            try {
                const settings = window.configSettings ? window.configSettings.getSettings() : {};
                const constraints = {
                    audio: {
                        deviceId: settings.microphoneId ? { exact: settings.microphoneId } : undefined,
                        sampleRate: settings.sampleRate || 44100,
                        channelCount: 1
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                const recorder = new MediaRecorder(stream);
                let chunks = [];

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                recorder.onstop = () => {
                    // Don't stop tracks in test mode to avoid permission re-requests
                    const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                    const url = URL.createObjectURL(audioBlob);
                    
                    testStatus.innerHTML = `
                        <div>Test recording completed!</div>
                        <audio controls style="width: 100%; margin-top: 10px;">
                            <source src="${url}" type="audio/wav">
                        </audio>
                    `;
                    
                    testBtn.textContent = '🎤 Test Record';
                    testBtn.disabled = false;
                };

                recorder.start();
                testBtn.textContent = '⏹ Stop Test';
                testStatus.textContent = 'Recording test audio for 3 seconds...';
                
                setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                }, 3000);

            } catch (error) {
                testStatus.textContent = 'Error: Could not access microphone';
                testBtn.textContent = '🎤 Test Record';
            }
        } else {
            // Stop recording logic would go here
            testBtn.textContent = '🎤 Test Record';
        }
    }

    // Mobile-specific initialization
    initializeMobileSupport() {
        const utilities = window.utilities;
        if (!utilities) return;

        const isMobile = utilities.isMobileDevice();
        if (isMobile) {
            console.log('Mobile device detected, using mobile-optimized audio settings');
            
            // Ensure audio context is created on first user interaction
            document.addEventListener('touchstart', function initAudioContext() {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                    console.log('Audio context initialized on mobile');
                } catch (error) {
                    console.warn('Could not initialize audio context:', error);
                }
                // Remove this listener after first touch
                document.removeEventListener('touchstart', initAudioContext);
            }, { once: true });
            
            // Add visual indicator for mobile users about HTTPS requirement
            if (utilities.requiresHTTPS()) {
                setTimeout(() => {
                    this.showStatus('⚠️ HTTPS required for mobile recording. Some features may not work.', 'error');
                }, 1000);
            }
        }
    }

    // Cleanup function to properly close audio stream when leaving page
    cleanupAudioResources() {
        const appState = window.appState;
        if (appState) {
            const audioStream = appState.getAudioStream();
            if (audioStream) {
                const utilities = window.utilities;
                const cleanedStream = utilities ? utilities.cleanupAudioResources(audioStream) : null;
                appState.setAudioStream(cleanedStream);
                appState.setMicrophonePermissionGranted(false);
            }
        }
    }

    // Utility method for showing status
    showStatus(message, type = 'info') {
        if (window.uiController && window.uiController.showStatus) {
            window.uiController.showStatus(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Export singleton instance
window.AudioManager = AudioManager;