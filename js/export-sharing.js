// Export and Sharing Module
class ExportSharing {
    constructor() {}

    // Export lesson functionality
    async exportLesson() {
        const exportBtn = document.getElementById('downloadAllBtn');
        const originalText = exportBtn ? exportBtn.innerHTML : null;
        
        try {
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '⏳';
            }
            this.showStatus('Preparing lesson export...', 'processing');
            
            const appState = window.appState;
            if (!appState) throw new Error('App state not available');

            // Collect all audio pieces from current session
            const allPieces = [];
            const currentSessionPieces = appState.getCurrentSessionPieces();
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
                this.showStatus('No recordings to export', 'error');
                return;
            }
            
            this.showStatus(`Converting ${allPieces.length} files to MP3...`, 'processing');
            
            // Create ZIP file using JSZip
            const zip = new JSZip();
            
            const utilities = window.utilities;
            if (!utilities) throw new Error('Utilities not available');

            // Convert and add each audio file to the ZIP
            for (let i = 0; i < allPieces.length; i++) {
                const piece = allPieces[i];
                this.showStatus(`Converting to MP3... (${i + 1}/${allPieces.length})`, 'processing');
                
                try {
                    const audioBuffer = await utilities.blobToAudioBuffer(piece.data);
                    const mp3Blob = await utilities.encodeToMP3(audioBuffer);
                    zip.file(piece.name + '.mp3', mp3Blob);
                } catch (error) {
                    console.error(`Error converting ${piece.name} to MP3:`, error);
                    // Fallback to original format if MP3 conversion fails
                    zip.file(piece.name + '.wav', piece.data);
                }
            }
            
            this.showStatus('Creating ZIP file...', 'processing');
            
            // Add lesson summary
            const dataManager = window.dataManager;
            const configSettings = window.configSettings;
            const currentSet = dataManager ? dataManager.getCurrentSet() : null;
            const settings = configSettings ? configSettings.getSettings() : {};
            
            const lessonSummary = {
                exportDate: new Date().toISOString(),
                totalRecordings: allPieces.length,
                exerciseSet: currentSet ? currentSet.name : 'Unknown',
                settings: {
                    sampleRate: settings.sampleRate || 44100,
                    silenceThreshold: settings.silenceThreshold || 0.01,
                    silenceDuration: settings.silenceDuration || 0.5,
                    exportFormat: 'MP3'
                }
            };
            
            zip.file('lesson_summary.json', JSON.stringify(lessonSummary, null, 2));
            
            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Download the ZIP file
            if (utilities) {
                const filename = `vocal_lesson_${utilities.getCurrentDateString()}.zip`;
                utilities.downloadFile(zipBlob, filename);
            }
            
            this.showStatus(`Lesson exported! ${allPieces.length} MP3 files included.`, 'success');
            
        } catch (error) {
            console.error('Error exporting lesson:', error);
            this.showStatus('Error exporting lesson', 'error');
        } finally {
            if (exportBtn && originalText !== null) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = originalText;
            }
        }
    }

    downloadAllPieces() {
        this.exportLesson();
    }

    async downloadSinglePiece(pieceId, exerciseKey) {
        const appState = window.appState;
        const utilities = window.utilities;
        if (!appState || !utilities) return;

        const currentSessionPieces = appState.getCurrentSessionPieces();
        const pieces = currentSessionPieces[exerciseKey] || [];
        const piece = pieces.find(p => p.id === pieceId);
        
        if (piece) {
            try {
                this.showStatus('Converting to MP3...', 'processing');
                const audioBuffer = await utilities.blobToAudioBuffer(piece.audioData);
                const mp3Blob = await utilities.encodeToMP3(audioBuffer);
                
                utilities.downloadFile(mp3Blob, piece.name + '.mp3');
                this.showStatus('MP3 audio piece downloaded!', 'success');
            } catch (error) {
                console.error('Error converting to MP3:', error);
                this.showStatus('Error converting to MP3', 'error');
            }
        } else {
            console.error('Audio piece not found for download:', pieceId, exerciseKey);
            this.showStatus('Audio piece not found', 'error');
        }
    }

    async downloadSinglePieceFromLesson(pieceId) {
        const dataManager = window.dataManager;
        const appState = window.appState;
        const utilities = window.utilities;
        if (!dataManager || !appState || !utilities) return;

        const exercises = dataManager.getCurrentExercises();
        if (!exercises[appState.getCurrentExerciseIndex()]) return;
        
        const exerciseKey = `exercise_${exercises[appState.getCurrentExerciseIndex()].id}`;
        const currentSessionPieces = appState.getCurrentSessionPieces();
        const pieces = currentSessionPieces[exerciseKey] || [];
        const piece = pieces.find(p => p.id === pieceId);
        
        if (piece) {
            try {
                this.showStatus('Converting to MP3...', 'processing');
                const audioBuffer = await utilities.blobToAudioBuffer(piece.audioData);
                const mp3Blob = await utilities.encodeToMP3(audioBuffer);
                
                utilities.downloadFile(mp3Blob, piece.name + '.mp3');
                this.showStatus('MP3 audio piece downloaded!', 'success');
            } catch (error) {
                console.error('Error converting to MP3:', error);
                this.showStatus('Error converting to MP3', 'error');
            }
        }
    }

    // Share functionality
    async shareLesson() {
        const shareBtn = document.getElementById('shareBtnSummary');
        const originalText = shareBtn ? shareBtn.innerHTML : '';
        
        try {
            if (shareBtn) {
                shareBtn.disabled = true;
                shareBtn.innerHTML = '⏳';
            }
            this.showStatus('Preparing lesson for sharing...', 'processing');
            
            const configSettings = window.configSettings;
            if (!configSettings) throw new Error('Config settings not available');

            const supabaseClient = configSettings.initSupabase();
            if (!supabaseClient) {
                throw new Error('Supabase not configured properly');
            }
            
            const appState = window.appState;
            const utilities = window.utilities;
            if (!appState || !utilities) throw new Error('Dependencies not available');

            // Collect all audio pieces from current session
            const allPieces = [];
            const currentSessionPieces = appState.getCurrentSessionPieces();
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
                this.showStatus('No recordings to share', 'error');
                return;
            }
            
            this.showStatus(`Uploading ${allPieces.length} recordings...`, 'processing');
            
            // Generate unique session ID
            const sessionId = utilities.generateSessionId();
            const dataManager = window.dataManager;
            const currentSet = dataManager ? dataManager.getCurrentSet() : null;
            
            // Upload each audio file to Supabase Storage
            const uploadedFiles = [];
            for (let i = 0; i < allPieces.length; i++) {
                const piece = allPieces[i];
                const fileName = `${sessionId}/${piece.name}`;
                
                // Convert audio data to MP3 if needed
                let audioBlob;
                if (piece.data instanceof ArrayBuffer) {
                    // Convert ArrayBuffer to MP3
                    const audioContext = await utilities.createAudioContext();
                    const audioBuffer = await audioContext.decodeAudioData(piece.data.slice());
                    const mp3Data = await utilities.encodeToMP3(audioBuffer);
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
                
                this.showStatus(`Uploaded ${i + 1}/${allPieces.length} files...`, 'processing');
            }
            
            // Save lesson metadata to database (optional - fallback if RLS not configured)
            const lessonData = {
                session_id: sessionId,
                set_name: currentSet ? currentSet.name : 'Unknown Set',
                set_description: currentSet ? currentSet.description : '',
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
                    
                    this.showStatus('Files uploaded successfully! (Note: Lesson metadata not saved due to database policy)', 'success');
                }
                
                // Continue without database record - files are still shared
                console.log('📁 Continuing with file-only sharing (files uploaded successfully)');
            }
            
            // Generate and display shareable link
            const shareUrl = utilities.generateShareUrl(sessionId);
            if (window.uiController) {
                window.uiController.showShareResult(shareUrl);
            }
            this.showStatus('Lesson shared successfully!', 'success');
            
        } catch (error) {
            console.error('Error sharing lesson:', error);
            this.showStatus('Error sharing lesson: ' + error.message, 'error');
        } finally {
            if (shareBtn) {
                shareBtn.disabled = false;
                shareBtn.innerHTML = originalText;
            }
        }
    }

    // Handle shared lesson loading from URL parameters
    async handleSharedLesson() {
        const urlParams = new URLSearchParams(window.location.search);
        const lessonId = urlParams.get('lesson');
        
        if (!lessonId) {
            return; // No lesson parameter, continue normally
        }
        
        console.log('🔗 Loading shared lesson:', lessonId);
        this.showStatus('Loading shared lesson...', 'processing');
        
        // Hide recording controls when in lesson review mode
        const recordingSection = document.querySelector('.recording-section');
        if (recordingSection) {
            recordingSection.style.display = 'none';
        }
        
        try {
            const configSettings = window.configSettings;
            if (!configSettings) throw new Error('Config settings not available');

            const supabaseClient = configSettings.initSupabase();
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
                    
                    this.showStatus(`Loading shared recordings... (${loadedCount}/${fileList.length})`, 'processing');
                    
                } catch (fileError) {
                    console.error(`Error processing ${file.name}:`, fileError);
                }
            }
            
            const appState = window.appState;
            if (!appState) throw new Error('App state not available');

            // Set up the shared lesson view
            appState.setCurrentSessionPieces(sharedPieces);
            
            // Create a temporary exercise set for shared lessons
            const sharedExercises = Object.keys(sharedPieces).map((key, index) => {
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
            appState.setSharedExercises(sharedExercises);
            appState.setIsSharedSession(true);
            appState.setCurrentSetIndex(0);
            appState.setCurrentExerciseIndex(0);
            appState.setSessionActive(true);
            
            const uiController = window.uiController;
            if (uiController) {
                // Show lesson view with shared recordings
                uiController.showLessons();
                uiController.updateExerciseDisplay();
            }
            
            // Update page title and header
            document.title = `GOLOSINA - Shared Lesson ${lessonId}`;
            const exerciseTitle = document.getElementById('exerciseTitle');
            const setTitle = document.getElementById('setTitle');
            if (exerciseTitle && setTitle) {
                setTitle.textContent = lessonMetadata?.set_name || 'Shared Lesson';
                exerciseTitle.textContent = sharedExercises[0]?.name || 'Shared Exercise';
            }
            
            this.showStatus(`Loaded shared lesson with ${loadedCount} recordings!`, 'success');
            
        } catch (error) {
            console.error('Error loading shared lesson:', error);
            this.showStatus(`Error loading shared lesson: ${error.message}`, 'error');
            
            // Fall back to normal app behavior
            setTimeout(() => {
                if (window.uiController) {
                    window.uiController.showLanding();
                }
            }, 3000);
        }
    }

    // Audio playback for various contexts
    playAudioPieceSummary(pieceId, exerciseKey) {
        const appState = window.appState;
        if (!appState) return;

        const currentSessionPieces = appState.getCurrentSessionPieces();
        const pieces = currentSessionPieces[exerciseKey] || [];
        const piece = pieces.find(p => p.id === pieceId);
        
        if (piece) {
            const audio = new Audio(URL.createObjectURL(piece.audioData));
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
                this.showStatus('Error playing audio piece', 'error');
            });
        } else {
            console.error('Audio piece not found:', pieceId, exerciseKey);
            this.showStatus('Audio piece not found', 'error');
        }
    }

    // Delete operations
    deleteAudioPieceSummary(pieceId, exerciseKey) {
        if (confirm('Are you sure you want to delete this audio piece?')) {
            const appState = window.appState;
            if (!appState) return;

            appState.removeCurrentSessionPiece(exerciseKey, pieceId);
            
            if (window.uiController) {
                window.uiController.updateSummaryPage();
                window.uiController.updateExportButton();
            }
            if (window.configSettings) {
                window.configSettings.saveSettings();
            }
            this.showStatus('Audio piece deleted', 'success');
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
window.ExportSharing = ExportSharing;