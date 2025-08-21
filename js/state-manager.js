// State Management Module
class StateManager {
    constructor() {
        // Application State
        this.currentSetIndex = 0;
        this.currentExerciseIndex = 0;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.recordedChunks = [];
        this.audioPieces = {};
        this.currentSessionPieces = {}; // Only current session recordings
        this.microphonePermissionGranted = false; // Track if microphone permission is granted
        this.currentView = 'landing'; // 'landing', 'lesson', 'summary'
        this.sessionActive = false;
        this.sharedExercises = []; // For storing exercises from shared lessons
        this.isSharedSession = false; // Flag to indicate if viewing a shared lesson
    }

    // State getters
    getCurrentSetIndex() {
        return this.currentSetIndex;
    }

    getCurrentExerciseIndex() {
        return this.currentExerciseIndex;
    }

    getIsRecording() {
        return this.isRecording;
    }

    getMediaRecorder() {
        return this.mediaRecorder;
    }

    getAudioStream() {
        return this.audioStream;
    }

    getRecordedChunks() {
        return this.recordedChunks;
    }

    getAudioPieces() {
        return this.audioPieces;
    }

    getCurrentSessionPieces() {
        return this.currentSessionPieces;
    }

    getMicrophonePermissionGranted() {
        return this.microphonePermissionGranted;
    }

    getCurrentView() {
        return this.currentView;
    }

    getSessionActive() {
        return this.sessionActive;
    }

    getSharedExercises() {
        return this.sharedExercises;
    }

    getIsSharedSession() {
        return this.isSharedSession;
    }

    // State setters
    setCurrentSetIndex(index) {
        this.currentSetIndex = index;
    }

    setCurrentExerciseIndex(index) {
        this.currentExerciseIndex = index;
    }

    setIsRecording(recording) {
        this.isRecording = recording;
    }

    setMediaRecorder(recorder) {
        this.mediaRecorder = recorder;
    }

    setAudioStream(stream) {
        this.audioStream = stream;
    }

    setRecordedChunks(chunks) {
        this.recordedChunks = chunks;
    }

    setAudioPieces(pieces) {
        this.audioPieces = pieces;
    }

    setCurrentSessionPieces(pieces) {
        this.currentSessionPieces = pieces;
    }

    setMicrophonePermissionGranted(granted) {
        this.microphonePermissionGranted = granted;
    }

    setCurrentView(view) {
        this.currentView = view;
    }

    setSessionActive(active) {
        this.sessionActive = active;
    }

    setSharedExercises(exercises) {
        this.sharedExercises = exercises;
    }

    setIsSharedSession(isShared) {
        this.isSharedSession = isShared;
    }

    // State operations
    clearRecordedChunks() {
        this.recordedChunks = [];
    }

    addRecordedChunk(chunk) {
        this.recordedChunks.push(chunk);
    }

    clearCurrentSessionPieces() {
        this.currentSessionPieces = {};
    }

    addCurrentSessionPiece(exerciseKey, piece) {
        if (!this.currentSessionPieces[exerciseKey]) {
            this.currentSessionPieces[exerciseKey] = [];
        }
        this.currentSessionPieces[exerciseKey].push(piece);
    }

    removeCurrentSessionPiece(exerciseKey, pieceId) {
        if (this.currentSessionPieces[exerciseKey]) {
            this.currentSessionPieces[exerciseKey] = this.currentSessionPieces[exerciseKey].filter(p => p.id !== pieceId);
        }
    }

    mergeCurrentSessionToAudioPieces() {
        Object.keys(this.currentSessionPieces).forEach(key => {
            if (!this.audioPieces[key]) {
                this.audioPieces[key] = [];
            }
            this.audioPieces[key] = this.audioPieces[key].concat(this.currentSessionPieces[key]);
        });
    }

    resetToInitialState() {
        this.currentSetIndex = 0;
        this.currentExerciseIndex = 0;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.currentSessionPieces = {};
        this.currentView = 'landing';
        this.sessionActive = false;
        this.sharedExercises = [];
        this.isSharedSession = false;
    }
}

// Export singleton instance
window.StateManager = StateManager;