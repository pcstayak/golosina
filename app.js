// Application State
        let currentSetIndex = 0;
        let currentExerciseIndex = 0;
        let isRecording = false;
        let mediaRecorder = null;
        let audioStream = null;
        let recordedChunks = [];
        let audioPieces = {};
        let currentSessionPieces = {}; // Only current session recordings
        let microphonePermissionGranted = false; // Track if microphone permission is granted
        let currentView = 'landing'; // 'landing', 'lesson', 'summary'
        let sessionActive = false;
        let sharedExercises = []; // For storing exercises from shared lessons
        let isSharedSession = false; // Flag to indicate if viewing a shared lesson
        let settings = {
            microphoneId: '',
            sampleRate: 44100,
            silenceThreshold: 0.01,
            silenceDuration: 0.5
        };

        // Supabase configuration
        let supabase;
        const SUPABASE_URL = 'https://cansvchorbzeqenctscc.supabase.co/'; // Replace with your Supabase URL
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbnN2Y2hvcmJ6ZXFlbmN0c2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDY1MjAsImV4cCI6MjA3MTEyMjUyMH0.1_kHpqy0RROOAOT1tA5YWIPgKI3ZZSvomD6srrOok5I'; // Replace with your Supabase anon key

        // Initialize Supabase (will be initialized when needed)
        function initSupabase() {
            if (!supabase) {
                try {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                } catch (error) {
                    console.error('Failed to initialize Supabase:', error);
                    showStatus('Supabase configuration error. Please check settings.', 'error');
                }
            }
            return supabase;
        }

        // Default exercise sets
        let exerciseSets = [
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

        // Helper function to get current exercises
        function getCurrentExercises() {
            if (isSharedSession) {
                console.log('Getting shared exercises:', sharedExercises);
                return sharedExercises || [];
            }
            const exercises = exerciseSets[currentSetIndex]?.exercises || [];
            console.log('Getting regular exercises:', exercises);
            return exercises;
        }

        // Helper function to get current set
        function getCurrentSet() {
            return exerciseSets[currentSetIndex];
        }

        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            initializeAudioDevices();
            showLanding();
            updateExportButton();
            setupEventListeners();
        });

        // Settings management
        function loadSettings() {
            const savedSettings = localStorage.getItem('voiceSlicerSettings');
            if (savedSettings) {
                settings = { ...settings, ...JSON.parse(savedSettings) };
            }
            
            const savedExerciseSets = localStorage.getItem('voiceSlicerExerciseSets');
            if (savedExerciseSets) {
                exerciseSets = JSON.parse(savedExerciseSets);
            }

            const savedPieces = localStorage.getItem('voiceSlicerPieces');
            if (savedPieces) {
                audioPieces = JSON.parse(savedPieces);
            }

            const savedSetIndex = localStorage.getItem('voiceSlicerCurrentSetIndex');
            if (savedSetIndex !== null) {
                currentSetIndex = parseInt(savedSetIndex);
            }

            const savedExerciseIndex = localStorage.getItem('voiceSlicerCurrentExerciseIndex');
            if (savedExerciseIndex !== null) {
                currentExerciseIndex = parseInt(savedExerciseIndex);
            }

            updateSettingsUI();
        }

        function saveSettings() {
            localStorage.setItem('voiceSlicerSettings', JSON.stringify(settings));
            localStorage.setItem('voiceSlicerExerciseSets', JSON.stringify(exerciseSets));
            localStorage.setItem('voiceSlicerPieces', JSON.stringify(audioPieces));
            localStorage.setItem('voiceSlicerCurrentSetIndex', currentSetIndex.toString());
            localStorage.setItem('voiceSlicerCurrentExerciseIndex', currentExerciseIndex.toString());
        }

        function updateSettingsUI() {
            document.getElementById('sampleRateSelect').value = settings.sampleRate;
            document.getElementById('silenceThreshold').value = settings.silenceThreshold;
            document.getElementById('silenceDuration').value = settings.silenceDuration;
            document.getElementById('thresholdValue').textContent = settings.silenceThreshold;
            document.getElementById('durationValue').textContent = settings.silenceDuration + 's';
            
            // Load current exercise sets into JSON editor
            loadJsonEditor();
        }

        // Audio device initialization
        async function initializeAudioDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                
                const select = document.getElementById('microphoneSelect');
                select.innerHTML = '<option value="">Default microphone</option>';
                
                audioInputs.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${device.deviceId.substr(0, 8)}`;
                    select.appendChild(option);
                });

                if (settings.microphoneId) {
                    select.value = settings.microphoneId;
                }
            } catch (error) {
                console.error('Error enumerating audio devices:', error);
            }
        }

        // Check and request microphone permission
        async function ensureMicrophonePermission() {
            if (microphonePermissionGranted && audioStream && audioStream.active) {
                return audioStream; // Already have permission and active stream
            }

            try {
                // Check if we have permission without requesting it first
                if (navigator.permissions) {
                    const permission = await navigator.permissions.query({ name: 'microphone' });
                    if (permission.state === 'denied') {
                        throw new Error('Microphone permission denied');
                    }
                }

                // Detect mobile device for constraints
                const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Check if HTTPS is required (only for mobile browsers)
                const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1';
                if (isMobile && location.protocol !== 'https:' && !isLocalHost) {
                    throw new Error('Audio recording requires HTTPS on mobile devices. Please access this page via HTTPS.');
                }

                // Request microphone access
                const constraints = {
                    audio: isMobile ? {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } : {
                        deviceId: settings.microphoneId ? { exact: settings.microphoneId } : undefined,
                        sampleRate: settings.sampleRate,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                };

                // Don't close existing stream - keep it alive for permission caching

                console.log('🔧 Audio constraints:', constraints);
                
                try {
                    audioStream = await navigator.mediaDevices.getUserMedia(constraints);
                    console.log('✅ Got audio stream:', audioStream);
                } catch (getUserMediaError) {
                    console.warn('❌ Enhanced constraints failed, trying basic audio...', getUserMediaError);
                    // Fallback to most basic audio constraints
                    const basicConstraints = { audio: true };
                    audioStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
                    console.log('✅ Got audio stream with basic constraints:', audioStream);
                }

                microphonePermissionGranted = true;
                console.log('✅ Microphone permission granted and cached');
                return audioStream;

            } catch (error) {
                microphonePermissionGranted = false;
                console.error('❌ Failed to get microphone permission:', error);
                throw error;
            }
        }

        // Landing page functionality
        function renderExerciseSets() {
            const setsGrid = document.getElementById('setsGrid');
            setsGrid.innerHTML = '';

            exerciseSets.forEach((set, index) => {
                const recordingsCount = getSetRecordingsCount(set.id);
                const setCard = document.createElement('div');
                setCard.className = 'exercise-set-card';
                setCard.style.borderLeftColor = set.color;
                setCard.onclick = () => selectExerciseSet(index);
                
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

        function getSetRecordingsCount(setId) {
            const set = exerciseSets.find(s => s.id === setId);
            if (!set) return 0;
            
            let count = 0;
            set.exercises.forEach(exercise => {
                const exerciseKey = `exercise_${exercise.id}`;
                count += (currentSessionPieces[exerciseKey] || []).length;
            });
            return count;
        }

        function selectExerciseSet(setIndex) {
            currentSetIndex = setIndex;
            currentExerciseIndex = 0;
            startNewSession();
            showLessons();
        }

        function startNewSession() {
            // Clear previous session data
            currentSessionPieces = {};
            sessionActive = true;
            
            // Force update displays to show empty state immediately
            setTimeout(() => {
                updateAudioPiecesDisplay();
                updateExportButton();
            }, 50);
            
            saveSettings();
        }

        function endSession() {
            if (confirm('Are you sure you want to end this session? All recordings from this session will be cleared.')) {
                // Move current session pieces to permanent storage
                Object.keys(currentSessionPieces).forEach(key => {
                    if (!audioPieces[key]) {
                        audioPieces[key] = [];
                    }
                    audioPieces[key] = audioPieces[key].concat(currentSessionPieces[key]);
                });
                
                // Clear session
                currentSessionPieces = {};
                sessionActive = false;
                currentSetIndex = 0;
                currentExerciseIndex = 0;
                
                saveSettings();
                showLanding();
                showStatus('Session ended. Recordings have been saved.', 'success');
            }
        }

        function showLanding() {
            document.getElementById('landingPage').classList.remove('hide');
            document.getElementById('lessonPage').classList.add('hide');
            document.getElementById('summaryPage').classList.remove('show');
            currentView = 'landing';
            renderExerciseSets();
        }

        function abandonLesson() {
            if (confirm('Are you sure you want to abandon this lesson? All recordings from this session will be lost.')) {
                // Clear all current session data
                currentSessionPieces = {};
                sessionActive = false;
                
                // Stop recording if active
                if (isRecording) {
                    toggleRecording();
                }
                
                // Return to landing page
                showLanding();
                saveSettings();
            }
        }

        function showLessons() {
            document.getElementById('landingPage').classList.add('hide');
            document.getElementById('lessonPage').classList.remove('hide');
            document.getElementById('summaryPage').classList.remove('show');
            currentView = 'lesson';
            updateExerciseDisplay();
            updateNavigationButtons();
        }

        // Exercise navigation
        function updateExerciseDisplay() {
            const currentSet = getCurrentSet();
            const exercises = getCurrentExercises();
            const exercise = exercises[currentExerciseIndex];
            
            if (!exercise) return;
            
            document.getElementById('exerciseTitle').textContent = exercise.name;
            document.getElementById('exerciseDescription').textContent = exercise.description;
            document.getElementById('exerciseCounter').textContent = `${currentExerciseIndex + 1} of ${exercises.length}`;
            
            // Update set header info
            const setHeaderInfo = document.querySelector('.set-header-info');
            if (setHeaderInfo) {
                setHeaderInfo.style.setProperty('--set-color', currentSet.color);
            }
            
            // Update set title and description
            document.getElementById('setTitle').textContent = currentSet.name;
            document.getElementById('setDescription').textContent = currentSet.description;
            
            updateAudioPiecesDisplay();
            saveSettings();
        }


        // Summary page functionality
        function showSummary() {
            document.getElementById('lessonPage').classList.add('hide');
            document.getElementById('summaryPage').classList.add('show');
            updateSummaryPage();
        }

        function hideSummary() {
            document.getElementById('lessonPage').classList.remove('hide');
            document.getElementById('summaryPage').classList.remove('show');
        }

        function updateSummaryPage() {
            updateSummaryStats();
            renderLessonSections();
            updateDownloadAllButton();
        }

        function updateSummaryStats() {
            const currentSet = getCurrentSet();
            if (!currentSet) return;
            
            let lessonsWithRecordings = 0;
            let totalRecordings = 0;
            
            currentSet.exercises.forEach(exercise => {
                const exerciseKey = `exercise_${exercise.id}`;
                const count = (currentSessionPieces[exerciseKey] || []).length;
                if (count > 0) {
                    lessonsWithRecordings++;
                    totalRecordings += count;
                }
            });
            
            document.getElementById('totalLessons').textContent = lessonsWithRecordings;
            document.getElementById('totalRecordings').textContent = totalRecordings;
            document.getElementById('totalDuration').textContent = '0:00'; // Placeholder for duration calculation
        }

        function renderLessonSections() {
            const summaryContent = document.getElementById('summaryContent');
            summaryContent.innerHTML = '';

            // Show only current session from selected set
            const currentSet = getCurrentSet();
            if (!currentSet) return;

            const setSection = document.createElement('div');
            setSection.innerHTML = `<h2 style="color: ${currentSet.color}; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid ${currentSet.color};">${currentSet.name} - Current Session</h2>`;
            summaryContent.appendChild(setSection);

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

        function toggleLessonSection(exerciseId) {
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
                targetSection.classList.toggle('collapsed');
                icon.textContent = targetSection.classList.contains('collapsed') ? '▶' : '▼';
            }
        }

        function playAudioPieceSummary(pieceId, exerciseKey) {
            const pieces = currentSessionPieces[exerciseKey] || [];
            const piece = pieces.find(p => p.id === pieceId);
            
            if (piece) {
                const audio = new Audio(URL.createObjectURL(piece.audioData));
                audio.play().catch(error => {
                    console.error('Error playing audio:', error);
                    showStatus('Error playing audio piece', 'error');
                });
            } else {
                console.error('Audio piece not found:', pieceId, exerciseKey);
                showStatus('Audio piece not found', 'error');
            }
        }

        async function downloadSinglePiece(pieceId, exerciseKey) {
            const pieces = currentSessionPieces[exerciseKey] || [];
            const piece = pieces.find(p => p.id === pieceId);
            
            if (piece) {
                try {
                    showStatus('Converting to MP3...', 'processing');
                    const audioBuffer = await blobToAudioBuffer(piece.audioData);
                    const mp3Blob = await encodeToMP3(audioBuffer);
                    
                    const url = URL.createObjectURL(mp3Blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = piece.name + '.mp3';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showStatus('MP3 audio piece downloaded!', 'success');
                } catch (error) {
                    console.error('Error converting to MP3:', error);
                    showStatus('Error converting to MP3', 'error');
                }
            } else {
                console.error('Audio piece not found for download:', pieceId, exerciseKey);
                showStatus('Audio piece not found', 'error');
            }
        }

        function deleteAudioPieceSummary(pieceId, exerciseKey) {
            if (confirm('Are you sure you want to delete this audio piece?')) {
                currentSessionPieces[exerciseKey] = (currentSessionPieces[exerciseKey] || []).filter(p => p.id !== pieceId);
                updateSummaryPage();
                updateExportButton();
                saveSettings();
                showStatus('Audio piece deleted', 'success');
            }
        }

        function downloadAllPieces() {
            exportLesson();
        }

        function updateDownloadAllButton() {
            const downloadBtn = document.getElementById('downloadAllBtn');
            const totalPieces = Object.values(currentSessionPieces).reduce((total, pieces) => total + pieces.length, 0);
            
            downloadBtn.disabled = totalPieces === 0;
            downloadBtn.textContent = `📥 Download Session (${totalPieces} files)`;
        }

        function updateNavigationButtons() {
            const exercises = getCurrentExercises();
            const isLastLesson = currentExerciseIndex === exercises.length - 1;
            
            document.getElementById('prevBtn').disabled = currentExerciseIndex === 0;
            document.getElementById('nextBtn').disabled = isLastLesson;
            
            // Show Summary button only on last lesson
            const showSummaryBtn = document.getElementById('showSummaryBtn');
            if (showSummaryBtn) {
                showSummaryBtn.style.display = isLastLesson ? 'flex' : 'none';
            }
        }

        function previousExercise() {
            if (currentExerciseIndex > 0) {
                currentExerciseIndex--;
                updateExerciseDisplay();
                updateNavigationButtons();
            }
        }

        function nextExercise() {
            const exercises = getCurrentExercises();
            if (currentExerciseIndex < exercises.length - 1) {
                currentExerciseIndex++;
                updateExerciseDisplay();
                updateNavigationButtons();
            }
        }

        // Recording functionality
        async function toggleRecording() {
            if (!isRecording) {
                await startRecording();
            } else {
                stopRecording();
            }
        }

        async function startRecording() {
            try {
                console.log('🎤 Starting recording process...');
                
                // Check device type for mobile-specific handling
                const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                console.log(`📱 Device detected: ${isMobile ? 'Mobile' : 'Desktop'}`);
                
                // Use cached permission and stream
                audioStream = await ensureMicrophonePermission();
                
                // Use mobile-compatible MediaRecorder options
                let mediaRecorderOptions = {};
                if (isMobile) {
                    // Try different codecs for mobile compatibility
                    console.log('🎵 Checking supported audio formats...');
                    console.log('  - audio/webm;codecs=opus:', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
                    console.log('  - audio/webm:', MediaRecorder.isTypeSupported('audio/webm'));
                    console.log('  - audio/mp4:', MediaRecorder.isTypeSupported('audio/mp4'));
                    
                    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                        mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
                    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                        mediaRecorderOptions.mimeType = 'audio/webm';
                    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        mediaRecorderOptions.mimeType = 'audio/mp4';
                    }
                }
                
                console.log('🔴 Creating MediaRecorder with options:', mediaRecorderOptions);
                mediaRecorder = new MediaRecorder(audioStream, mediaRecorderOptions);
                console.log('✅ MediaRecorder created successfully');
                recordedChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    console.log('⏹️ Recording stopped, processing...');
                    processRecording();
                };

                console.log('▶️ Starting MediaRecorder...');
                mediaRecorder.start();
                console.log('✅ MediaRecorder started successfully');
                
                isRecording = true;
                updateRecordingUI();
                console.log('🎤 Recording is now active!');
            } catch (error) {
                console.error('Error starting recording:', error);
                
                // Provide specific error messages for common mobile issues
                let errorMessage = 'Error: Could not start recording';
                
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
                } else if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
                    errorMessage = 'No microphone found. Please check your device settings.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage = 'Audio recording not supported on this device/browser.';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    errorMessage = 'Microphone is busy or being used by another app.';
                } else if (error.message && error.message.includes('HTTPS')) {
                    errorMessage = error.message;
                } else {
                    errorMessage = `Recording error: ${error.message || error.name || 'Unknown error'}`;
                }
                
                console.log('Detailed error info:', {
                    name: error.name,
                    message: error.message,
                    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
                    isHTTPS: location.protocol === 'https:',
                    userAgent: navigator.userAgent
                });
                
                showStatus(errorMessage, 'error');
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                // Don't stop the audio stream tracks - keep them alive for permission caching
                isRecording = false;
                updateRecordingUI();
            }
        }

        function updateRecordingUI() {
            const recordBtn = document.getElementById('recordBtn');
            const statusDisplay = document.getElementById('statusDisplay');
            
            if (isRecording) {
                recordBtn.textContent = '⏹';
                recordBtn.className = 'record-btn recording';
                statusDisplay.textContent = 'Recording in progress...';
                statusDisplay.className = 'status-display status-recording';
            } else {
                recordBtn.textContent = '🎤';
                recordBtn.className = 'record-btn';
                statusDisplay.textContent = 'Ready to record';
                statusDisplay.className = 'status-display status-idle';
            }
        }

        // Audio processing
        async function processRecording() {
            showStatus('Processing recording...', 'processing');
            
            try {
                // Create blob with the correct MIME type based on what was recorded
                const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                let blobType = 'audio/wav';
                if (isMobile && mediaRecorder.mimeType) {
                    blobType = mediaRecorder.mimeType;
                }
                
                const audioBlob = new Blob(recordedChunks, { type: blobType });
                const audioBuffer = await audioBlob.arrayBuffer();
                
                // Create audio context with mobile compatibility
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                    sampleRate: isMobile ? 44100 : settings.sampleRate // Use standard sample rate on mobile
                });
                
                // Resume audio context if suspended (mobile requirement)
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                
                const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
                
                const pieces = await splitAudioBySilence(decodedAudio, audioContext);
                const exercises = getCurrentExercises();
                const exerciseKey = `exercise_${exercises[currentExerciseIndex].id}`;
                
                if (!currentSessionPieces[exerciseKey]) {
                    currentSessionPieces[exerciseKey] = [];
                }

                pieces.forEach((piece, index) => {
                    const exercises = getCurrentExercises();
                    const currentSessionCount = (currentSessionPieces[exerciseKey] || []).length;
                    const pieceData = {
                        id: `${exerciseKey}_${Date.now()}_${index}`,
                        name: `${exercises[currentExerciseIndex].name}_${getCurrentDateString()}_piece${currentSessionCount + index + 1}`,
                        audioData: piece,
                        timestamp: new Date().toISOString()
                    };
                    currentSessionPieces[exerciseKey].push(pieceData);
                });

                updateAudioPiecesDisplay();
                updateExportButton();
                saveSettings();
                showStatus(`Recording processed! Created ${pieces.length} audio pieces.`, 'success');
            } catch (error) {
                console.error('Error processing recording:', error);
                showStatus('Error processing recording', 'error');
            }
        }

        async function splitAudioBySilence(audioBuffer, audioContext) {
            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
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
                            
                            pieces.push(await audioBufferToBlob(pieceBuffer));
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
                
                pieces.push(await audioBufferToBlob(pieceBuffer));
            }

            return pieces.length > 0 ? pieces : [new Blob([audioBuffer], { type: 'audio/wav' })];
        }

        async function audioBufferToBlob(audioBuffer) {
            const numberOfChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const length = audioBuffer.length;
            
            const arrayBuffer = new ArrayBuffer(44 + length * 2);
            const view = new DataView(arrayBuffer);
            
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };
            
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + length * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numberOfChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, length * 2, true);
            
            const channelData = audioBuffer.getChannelData(0);
            let offset = 44;
            for (let i = 0; i < length; i++) {
                const sample = Math.max(-1, Math.min(1, channelData[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
            
            return new Blob([arrayBuffer], { type: 'audio/wav' });
        }

        // Audio pieces management
        function updateAudioPiecesDisplay() {
            const exercises = getCurrentExercises();
            console.log('updateAudioPiecesDisplay - exercises:', exercises, 'currentIndex:', currentExerciseIndex);
            
            if (!exercises || exercises.length === 0 || !exercises[currentExerciseIndex]) {
                console.warn('No exercise found at index:', currentExerciseIndex);
                return;
            }
            
            // Handle both regular exercises and shared lessons
            let exerciseKey, pieces;
            const currentExercise = exercises[currentExerciseIndex];
            const exerciseId = String(currentExercise?.id || '');
            
            console.log('Current exercise:', currentExercise, 'ID:', exerciseId);
            
            if (exerciseId.startsWith('shared_')) {
                // Find the matching shared exercise key
                const exerciseName = exercises[currentExerciseIndex].name;
                exerciseKey = Object.keys(currentSessionPieces).find(key => 
                    currentSessionPieces[key][0]?.exerciseName === exerciseName
                );
                pieces = exerciseKey ? currentSessionPieces[exerciseKey] || [] : [];
            } else {
                exerciseKey = `exercise_${exercises[currentExerciseIndex].id}`;
                pieces = currentSessionPieces[exerciseKey] || [];
            }
            
            const container = document.getElementById('audioPieces');
            const emptyState = document.getElementById('emptyState');
            
            if (pieces.length === 0) {
                emptyState.style.display = 'block';
                container.querySelectorAll('.audio-piece').forEach(el => el.remove());
                return;
            }
            
            emptyState.style.display = 'none';
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

        function playAudioPiece(pieceId, isShared = false) {
            console.log('🎵 Playing audio piece:', pieceId, 'isShared:', isShared);
            
            // Find the piece in current session pieces
            let piece = null;
            for (const key in currentSessionPieces) {
                const pieces = currentSessionPieces[key] || [];
                piece = pieces.find(p => (p.id || `${key}_${pieces.indexOf(p)}`) === pieceId);
                if (piece) {
                    console.log('Found piece:', piece);
                    break;
                }
            }
            
            if (!piece) {
                showStatus('Audio piece not found', 'error');
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
                showStatus('Error: Audio data not available', 'error');
                return;
            }
            
            console.log('Audio source:', audioSrc);
            
            const audio = new Audio();
            
            // Add error handling
            audio.onerror = (error) => {
                console.error('Audio load error:', error);
                console.error('Audio error code:', audio.error?.code, audio.error?.message);
                showStatus(`Audio load error: ${audio.error?.message || 'Unknown error'}`, 'error');
            };
            
            audio.onloadstart = () => {
                console.log('Audio loading started...');
                showStatus('Loading audio...', 'processing');
            };
            
            audio.oncanplay = () => {
                console.log('Audio can start playing');
                showStatus('Playing audio...', 'success');
            };
            
            // Set the source and try to play
            audio.src = audioSrc;
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
                showStatus(`Playback error: ${error.message}`, 'error');
            });
        }

        async function downloadSinglePieceFromLesson(pieceId) {
            const exercises = getCurrentExercises();
            if (!exercises[currentExerciseIndex]) return;
            const exerciseKey = `exercise_${exercises[currentExerciseIndex].id}`;
            const pieces = currentSessionPieces[exerciseKey] || [];
            const piece = pieces.find(p => p.id === pieceId);
            
            if (piece) {
                try {
                    showStatus('Converting to MP3...', 'processing');
                    const audioBuffer = await blobToAudioBuffer(piece.audioData);
                    const mp3Blob = await encodeToMP3(audioBuffer);
                    
                    const url = URL.createObjectURL(mp3Blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = piece.name + '.mp3';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    showStatus('MP3 audio piece downloaded!', 'success');
                } catch (error) {
                    console.error('Error converting to MP3:', error);
                    showStatus('Error converting to MP3', 'error');
                }
            }
        }

        function deleteAudioPiece(pieceId) {
            if (confirm('Are you sure you want to delete this audio piece?')) {
                const exercises = getCurrentExercises();
                if (!exercises[currentExerciseIndex]) return;
                const exerciseKey = `exercise_${exercises[currentExerciseIndex].id}`;
                currentSessionPieces[exerciseKey] = (currentSessionPieces[exerciseKey] || []).filter(p => p.id !== pieceId);
                updateAudioPiecesDisplay();
                updateExportButton();
                saveSettings();
                showStatus('Audio piece deleted', 'success');
            }
        }

        // Settings modal
        function openSettings() {
            document.getElementById('settingsModal').classList.add('show');
            updateSettingsUI();
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('show');
            saveSettings();
        }

        // Exercise management
        function importExercises() {
            document.getElementById('importFile').click();
        }

        function handleFileImport(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importedExercises = JSON.parse(e.target.result);
                        if (Array.isArray(importedExercises) && validateExerciseSets(importedExercises)) {
                            exerciseSets = importedExercises;
                            currentSetIndex = 0;
                            currentExerciseIndex = 0;
                            showLanding();
                            saveSettings();
                            showStatus('Exercise sets imported successfully!', 'success');
                        } else {
                            showStatus('Invalid exercise format', 'error');
                        }
                    } catch (error) {
                        showStatus('Error reading file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        }

        function validateExerciseSets(setsArray) {
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

        // JSON Editor functions
        function loadJsonEditor() {
            const editor = document.getElementById('jsonEditor');
            editor.value = JSON.stringify(exerciseSets, null, 2);
            editor.classList.remove('error');
            showStatus('Current exercise sets loaded into editor', 'success');
        }

        function saveFromJsonEditor() {
            const editor = document.getElementById('jsonEditor');
            const jsonText = editor.value.trim();
            
            if (!jsonText) {
                showStatus('Please enter JSON data first', 'error');
                return;
            }
            
            try {
                const parsedSets = JSON.parse(jsonText);
                if (Array.isArray(parsedSets) && validateExerciseSets(parsedSets)) {
                    exerciseSets = parsedSets;
                    currentSetIndex = 0;
                    currentExerciseIndex = 0;
                    editor.classList.remove('error');
                    showLanding();
                    saveSettings();
                    showStatus('Exercise sets updated from editor!', 'success');
                } else {
                    editor.classList.add('error');
                    showStatus('Invalid exercise sets format', 'error');
                }
            } catch (error) {
                editor.classList.add('error');
                showStatus('Invalid JSON syntax: ' + error.message, 'error');
            }
        }

        function formatJson() {
            const editor = document.getElementById('jsonEditor');
            const jsonText = editor.value.trim();
            
            if (!jsonText) {
                showStatus('Please enter JSON data first', 'error');
                return;
            }
            
            try {
                const parsed = JSON.parse(jsonText);
                editor.value = JSON.stringify(parsed, null, 2);
                editor.classList.remove('error');
                showStatus('JSON formatted successfully', 'success');
            } catch (error) {
                editor.classList.add('error');
                showStatus('Cannot format invalid JSON: ' + error.message, 'error');
            }
        }

        function exportExercises() {
            const dataStr = JSON.stringify(exerciseSets, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `exercise_sets_${getCurrentDateString()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus('Exercise sets exported successfully!', 'success');
        }

        function createExample() {
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
            
            const dataStr = JSON.stringify(exampleExercises, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `example_exercises_${getCurrentDateString()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus('Example file created successfully!', 'success');
        }

        function reloadExercises() {
            // In a full implementation, this would reload from a configured file path
            // For now, we'll just refresh the display
            updateExerciseDisplay();
            updateNavigationButtons();
            updateExportButton();
            showStatus('Exercises reloaded!', 'success');
        }

        // Test recording functionality
        async function testRecord() {
            const testBtn = document.getElementById('testRecordBtn');
            const testStatus = document.getElementById('testStatus');
            
            if (testBtn.textContent === '🎤 Test Record') {
                try {
                    const constraints = {
                        audio: {
                            deviceId: settings.microphoneId ? { exact: settings.microphoneId } : undefined,
                            sampleRate: settings.sampleRate,
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

        // Event listeners
        function setupEventListeners() {
            document.getElementById('microphoneSelect').addEventListener('change', (e) => {
                settings.microphoneId = e.target.value;
                saveSettings();
            });

            document.getElementById('sampleRateSelect').addEventListener('change', (e) => {
                settings.sampleRate = parseInt(e.target.value);
                saveSettings();
            });

            document.getElementById('silenceThreshold').addEventListener('input', (e) => {
                settings.silenceThreshold = parseFloat(e.target.value);
                document.getElementById('thresholdValue').textContent = e.target.value;
                saveSettings();
            });

            document.getElementById('silenceDuration').addEventListener('input', (e) => {
                settings.silenceDuration = parseFloat(e.target.value);
                document.getElementById('durationValue').textContent = e.target.value + 's';
                saveSettings();
            });

            // Close modal when clicking outside
            document.getElementById('settingsModal').addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    closeSettings();
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                const isSummaryVisible = document.getElementById('summaryPage').classList.contains('show');
                
                if (e.key === 'ArrowLeft' && !e.target.matches('input, select, textarea')) {
                    if (!isSummaryVisible) {
                        previousExercise();
                    }
                } else if (e.key === 'ArrowRight' && !e.target.matches('input, select, textarea')) {
                    if (!isSummaryVisible) {
                        nextExercise();
                    }
                } else if (e.key === ' ' && !e.target.matches('input, select, textarea')) {
                    e.preventDefault();
                    if (!isSummaryVisible) {
                        toggleRecording();
                    }
                } else if (e.key === 'Escape') {
                    if (isSummaryVisible) {
                        hideSummary();
                    } else {
                        closeSettings();
                    }
                } else if (e.key === 's' && e.ctrlKey) {
                    e.preventDefault();
                    if (isSummaryVisible) {
                        hideSummary();
                    } else {
                        showSummary();
                    }
                }
            });
        }

        // Export lesson functionality
        async function exportLesson() {
            const exportBtn = document.getElementById('downloadAllBtn');
            const originalText = exportBtn ? exportBtn.innerHTML : null;
            
            try {
                if (exportBtn) {
                    exportBtn.disabled = true;
                    exportBtn.innerHTML = '⏳';
                }
                showStatus('Preparing lesson export...', 'processing');
                
                // Collect all audio pieces from current session
                const allPieces = [];
                Object.keys(currentSessionPieces).forEach(exerciseKey => {
                    const pieces = currentSessionPieces[exerciseKey] || [];
                    pieces.forEach(piece => {
                        allPieces.push({
                            name: piece.name,
                            data: piece.audioData
                        });
                    });
                });
                
                if (allPieces.length === 0) {
                    showStatus('No recordings to export', 'error');
                    return;
                }
                
                showStatus(`Converting ${allPieces.length} files to MP3...`, 'processing');
                
                // Create ZIP file using JSZip
                const zip = new JSZip();
                
                // Convert and add each audio file to the ZIP
                for (let i = 0; i < allPieces.length; i++) {
                    const piece = allPieces[i];
                    showStatus(`Converting to MP3... (${i + 1}/${allPieces.length})`, 'processing');
                    
                    try {
                        const audioBuffer = await blobToAudioBuffer(piece.data);
                        const mp3Blob = await encodeToMP3(audioBuffer);
                        zip.file(piece.name + '.mp3', mp3Blob);
                    } catch (error) {
                        console.error(`Error converting ${piece.name} to MP3:`, error);
                        // Fallback to original format if MP3 conversion fails
                        zip.file(piece.name + '.wav', piece.data);
                    }
                }
                
                showStatus('Creating ZIP file...', 'processing');
                
                // Add lesson summary
                const currentSet = getCurrentSet();
                const lessonSummary = {
                    exportDate: new Date().toISOString(),
                    totalRecordings: allPieces.length,
                    exerciseSet: currentSet ? currentSet.name : 'Unknown',
                    settings: {
                        sampleRate: settings.sampleRate,
                        silenceThreshold: settings.silenceThreshold,
                        silenceDuration: settings.silenceDuration,
                        exportFormat: 'MP3'
                    }
                };
                
                zip.file('lesson_summary.json', JSON.stringify(lessonSummary, null, 2));
                
                // Generate ZIP file
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                
                // Download the ZIP file
                const url = URL.createObjectURL(zipBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `vocal_lesson_${getCurrentDateString()}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showStatus(`Lesson exported! ${allPieces.length} MP3 files included.`, 'success');
                
            } catch (error) {
                console.error('Error exporting lesson:', error);
                showStatus('Error exporting lesson', 'error');
            } finally {
                if (exportBtn && originalText !== null) {
                    exportBtn.disabled = false;
                    exportBtn.innerHTML = originalText;
                }
            }
        }
        
        // Update export button state based on available recordings
        function updateExportButton() {
            const exportBtn = document.getElementById('downloadAllBtn');
            if (exportBtn) {
                const totalPieces = Object.values(currentSessionPieces).reduce((total, pieces) => total + pieces.length, 0);
                exportBtn.disabled = totalPieces === 0;
            }
        }

        // MP3 Encoding function
        async function encodeToMP3(audioBuffer, bitRate = 128) {
            return new Promise((resolve, reject) => {
                try {
                    const sampleRate = audioBuffer.sampleRate;
                    const channelData = audioBuffer.getChannelData(0);
                    const samples = new Int16Array(channelData.length);
                    
                    // Convert float32 to int16
                    for (let i = 0; i < channelData.length; i++) {
                        const s = Math.max(-1, Math.min(1, channelData[i]));
                        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    
                    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, bitRate);
                    const mp3Data = [];
                    
                    const blockSize = 1152;
                    for (let i = 0; i < samples.length; i += blockSize) {
                        const sampleChunk = samples.subarray(i, i + blockSize);
                        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                        if (mp3buf.length > 0) {
                            mp3Data.push(mp3buf);
                        }
                    }
                    
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                    
                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                    resolve(mp3Blob);
                } catch (error) {
                    reject(error);
                }
            });
        }

        // Convert Blob to AudioBuffer for MP3 encoding
        async function blobToAudioBuffer(blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new AudioContext({ sampleRate: settings.sampleRate });
            return await audioContext.decodeAudioData(arrayBuffer);
        }

        // Utility functions
        function getCurrentDateString() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        }

        // Share functionality
        async function shareLesson() {
            const shareBtn = document.getElementById('shareBtnSummary');
            const originalText = shareBtn.innerHTML;
            
            try {
                shareBtn.disabled = true;
                shareBtn.innerHTML = '⏳';
                showStatus('Preparing lesson for sharing...', 'processing');
                
                const supabaseClient = initSupabase();
                if (!supabaseClient) {
                    throw new Error('Supabase not configured properly');
                }
                
                // Collect all audio pieces from current session
                const allPieces = [];
                Object.keys(currentSessionPieces).forEach(exerciseKey => {
                    const pieces = currentSessionPieces[exerciseKey] || [];
                    pieces.forEach(piece => {
                        allPieces.push({
                            name: piece.name,
                            data: piece.audioData
                        });
                    });
                });
                
                if (allPieces.length === 0) {
                    showStatus('No recordings to share', 'error');
                    return;
                }
                
                showStatus(`Uploading ${allPieces.length} recordings...`, 'processing');
                
                // Generate unique session ID
                const sessionId = generateSessionId();
                const currentSet = getCurrentSet();
                
                // Upload each audio file to Supabase Storage
                const uploadedFiles = [];
                for (let i = 0; i < allPieces.length; i++) {
                    const piece = allPieces[i];
                    const fileName = `${sessionId}/${piece.name}`;
                    
                    // Convert audio data to MP3 if needed
                    let audioBlob;
                    if (piece.data instanceof ArrayBuffer) {
                        // Convert ArrayBuffer to MP3
                        const audioBuffer = await audioContext.decodeAudioData(piece.data.slice());
                        const mp3Data = await encodeToMP3(audioBuffer);
                        audioBlob = new Blob([mp3Data], { type: 'audio/mp3' });
                    } else {
                        audioBlob = piece.data;
                    }
                    
                    const { data, error } = await supabaseClient.storage
                        .from('lesson-recordings')
                        .upload(fileName, audioBlob, {
                            cacheControl: '3600',
                            upsert: true // Allow overwriting if needed
                        });
                    
                    if (error) {
                        console.error('Upload error:', error);
                        // Provide more specific error information
                        if (error.message.includes('row-level security')) {
                            throw new Error(`Storage access denied. Please configure Supabase RLS policies:\n1. Go to Storage > lesson-recordings > Settings\n2. Add RLS policy: "Allow public uploads"\n3. Policy: (bucket_id = 'lesson-recordings')`);
                        }
                        throw new Error(`Failed to upload ${piece.name}: ${error.message}`);
                    }
                    
                    uploadedFiles.push({
                        name: piece.name,
                        path: data.path
                    });
                    
                    showStatus(`Uploaded ${i + 1}/${allPieces.length} files...`, 'processing');
                }
                
                // Save lesson metadata to database (optional - fallback if RLS not configured)
                const lessonData = {
                    session_id: sessionId,
                    set_name: currentSet.name,
                    set_description: currentSet.description,
                    recording_count: uploadedFiles.length,
                    files: uploadedFiles,
                    created_at: new Date().toISOString()
                };
                
                let lessonRecord = null;
                try {
                    const { data, error: dbError } = await supabaseClient
                        .from('shared_lessons')
                        .insert(lessonData)
                        .select()
                        .single();
                    
                    if (dbError) {
                        console.warn('Database insert failed:', dbError);
                        throw dbError;
                    }
                    lessonRecord = data;
                    console.log('✅ Lesson metadata saved to database');
                } catch (dbError) {
                    console.warn('⚠️ Could not save lesson metadata to database:', dbError);
                    
                    if (dbError.code === '42501' || (dbError.message && dbError.message.includes('row-level security'))) {
                        console.warn(`
🔧 Database RLS Policy Missing! 
To enable lesson metadata storage, run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS shared_lessons (
    session_id TEXT PRIMARY KEY,
    set_name TEXT NOT NULL,
    set_description TEXT,
    recording_count INTEGER NOT NULL,
    files JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE POLICY "Allow public inserts" 
ON shared_lessons 
FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow public reads" 
ON shared_lessons 
FOR SELECT 
TO public 
USING (true);
                        `);
                        
                        showStatus('Files uploaded successfully! (Note: Lesson metadata not saved due to database policy)', 'success');
                    }
                    
                    // Continue without database record - files are still shared
                    console.log('📁 Continuing with file-only sharing (files uploaded successfully)');
                }
                
                // Generate and display shareable link
                const shareUrl = generateShareUrl(sessionId);
                showShareResult(shareUrl);
                showStatus('Lesson shared successfully!', 'success');
                
            } catch (error) {
                console.error('Error sharing lesson:', error);
                showStatus('Error sharing lesson: ' + error.message, 'error');
            } finally {
                shareBtn.disabled = false;
                shareBtn.innerHTML = originalText;
            }
        }
        
        function generateSessionId() {
            const timestamp = Date.now().toString(36);
            const randomStr = Math.random().toString(36).substring(2, 8);
            return `${timestamp}-${randomStr}`;
        }
        
        function generateShareUrl(sessionId) {
            const baseUrl = window.location.origin + window.location.pathname;
            return `${baseUrl}?lesson=${sessionId}`;
        }
        
        function showShareResult(shareUrl) {
            const shareResult = document.getElementById('shareResult');
            const shareLink = document.getElementById('shareLink');
            
            shareLink.value = shareUrl;
            shareResult.style.display = 'block';
        }
        
        function copyShareLink() {
            const shareLink = document.getElementById('shareLink');
            shareLink.select();
            document.execCommand('copy');
            showStatus('Share link copied to clipboard!', 'success');
        }

        // Handle shared lesson loading from URL parameters
        async function handleSharedLesson() {
            const urlParams = new URLSearchParams(window.location.search);
            const lessonId = urlParams.get('lesson');
            
            if (!lessonId) {
                return; // No lesson parameter, continue normally
            }
            
            console.log('🔗 Loading shared lesson:', lessonId);
            showStatus('Loading shared lesson...', 'processing');
            
            // Hide recording controls when in lesson review mode
            const recordingSection = document.querySelector('.recording-section');
            if (recordingSection) {
                recordingSection.style.display = 'none';
            }
            
            try {
                const supabaseClient = initSupabase();
                if (!supabaseClient) {
                    throw new Error('Supabase not configured');
                }
                
                // Try to get lesson metadata from database (optional)
                let lessonMetadata = null;
                try {
                    const { data, error } = await supabaseClient
                        .from('shared_lessons')
                        .select('*')
                        .eq('session_id', lessonId)
                        .single();
                    
                    if (!error && data) {
                        lessonMetadata = data;
                        console.log('📊 Loaded lesson metadata:', lessonMetadata);
                    }
                } catch (metaError) {
                    console.warn('⚠️ Could not load lesson metadata (continuing without):', metaError);
                }
                
                // List all files in the lesson folder
                const { data: fileList, error: listError } = await supabaseClient.storage
                    .from('lesson-recordings')
                    .list(lessonId);
                
                if (listError) {
                    throw new Error(`Could not load lesson files: ${listError.message}`);
                }
                
                if (!fileList || fileList.length === 0) {
                    throw new Error('No recordings found for this lesson');
                }
                
                console.log(`📁 Found ${fileList.length} files in shared lesson`);
                
                // Download and set up the shared recordings
                const sharedPieces = {};
                let loadedCount = 0;
                
                for (const file of fileList) {
                    const filePath = `${lessonId}/${file.name}`;
                    
                    try {
                        // Download the file as blob instead of using public URL
                        const { data: fileData, error: downloadError } = await supabaseClient.storage
                            .from('lesson-recordings')
                            .download(filePath);
                        
                        if (downloadError) {
                            console.warn(`Could not download ${file.name}:`, downloadError);
                            // Fallback to public URL if download fails
                            const { data: urlData } = supabaseClient.storage
                                .from('lesson-recordings')
                                .getPublicUrl(filePath);
                            
                            if (urlData?.publicUrl) {
                                console.log(`Using public URL for ${file.name}:`, urlData.publicUrl);
                                
                                // Parse exercise info from filename
                                const exerciseMatch = file.name.match(/^(.+?)_\d{8}_piece\d+/);
                                const exerciseName = exerciseMatch ? exerciseMatch[1] : 'Unknown Exercise';
                                const exerciseKey = `shared_${exerciseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                
                                if (!sharedPieces[exerciseKey]) {
                                    sharedPieces[exerciseKey] = [];
                                }
                                
                                // Create audio piece object with public URL
                                const audioPiece = {
                                    name: file.name,
                                    url: urlData.publicUrl,
                                    isShared: true,
                                    exerciseName: exerciseName
                                };
                                
                                sharedPieces[exerciseKey].push(audioPiece);
                                loadedCount++;
                            }
                        } else {
                            // Successfully downloaded as blob
                            console.log(`Downloaded ${file.name} as blob:`, fileData);
                            
                            // Parse exercise info from filename
                            const exerciseMatch = file.name.match(/^(.+?)_\d{8}_piece\d+/);
                            const exerciseName = exerciseMatch ? exerciseMatch[1] : 'Unknown Exercise';
                            const exerciseKey = `shared_${exerciseName.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            
                            if (!sharedPieces[exerciseKey]) {
                                sharedPieces[exerciseKey] = [];
                            }
                            
                            // Create audio piece object with blob data
                            const audioPiece = {
                                name: file.name,
                                audioData: fileData, // Use blob data instead of URL
                                isShared: true,
                                exerciseName: exerciseName
                            };
                            
                            sharedPieces[exerciseKey].push(audioPiece);
                            loadedCount++;
                        }
                        
                        showStatus(`Loading shared recordings... (${loadedCount}/${fileList.length})`, 'processing');
                        
                    } catch (fileError) {
                        console.error(`Error processing ${file.name}:`, fileError);
                    }
                }
                
                // Set up the shared lesson view
                currentSessionPieces = sharedPieces;
                
                // Create a temporary exercise set for shared lessons
                sharedExercises = Object.keys(sharedPieces).map((key, index) => {
                    const exerciseName = sharedPieces[key][0]?.exerciseName || `Exercise ${index + 1}`;
                    console.log(`Creating shared exercise ${index}:`, exerciseName);
                    return {
                        id: `shared_${index}`,
                        name: exerciseName,
                        description: `Shared recording from lesson ${lessonId}`
                    };
                });
                
                console.log('Created shared exercises:', sharedExercises);
                
                // Set up shared lesson display
                isSharedSession = true;
                currentSetIndex = 0;
                currentExerciseIndex = 0;
                sessionActive = true;
                
                // Show lesson view with shared recordings
                showLessons();
                updateExerciseDisplay();
                
                // Update page title and header
                document.title = `GOLOSINA - Shared Lesson ${lessonId}`;
                const exerciseTitle = document.getElementById('exerciseTitle');
                const setTitle = document.getElementById('setTitle');
                if (exerciseTitle && setTitle) {
                    setTitle.textContent = lessonMetadata?.set_name || 'Shared Lesson';
                    exerciseTitle.textContent = sharedExercises[0]?.name || 'Shared Exercise';
                }
                
                showStatus(`Loaded shared lesson with ${loadedCount} recordings!`, 'success');
                
            } catch (error) {
                console.error('Error loading shared lesson:', error);
                showStatus(`Error loading shared lesson: ${error.message}`, 'error');
                
                // Fall back to normal app behavior
                setTimeout(() => {
                    showLanding();
                }, 3000);
            }
        }

        function showStatus(message, type = 'info') {
            const statusDisplay = document.getElementById('statusDisplay');
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

        // Mobile-specific initialization
        function initializeMobileSupport() {
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
                if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                    setTimeout(() => {
                        showStatus('⚠️ HTTPS required for mobile recording. Some features may not work.', 'error');
                    }, 1000);
                }
            }
        }

        // Cleanup function to properly close audio stream when leaving page
        function cleanupAudioResources() {
            if (audioStream) {
                console.log('🧹 Cleaning up audio resources...');
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
                microphonePermissionGranted = false;
            }
        }

        // Add cleanup listeners
        window.addEventListener('beforeunload', cleanupAudioResources);
        window.addEventListener('pagehide', cleanupAudioResources);

        // Initialize application
        document.addEventListener('DOMContentLoaded', async () => {
            loadSettings();
            renderExerciseSets();
            updateExerciseDisplay();
            initializeAudioDevices();
            setupEventListeners();
            initializeMobileSupport();
            
            // Check for shared lesson in URL parameters
            await handleSharedLesson();
        });