// Utilities Module
class Utilities {
    constructor() {}

    // Date utilities
    getCurrentDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    // Audio conversion utilities
    async blobToAudioBuffer(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext({ 
            sampleRate: window.configSettings ? window.configSettings.getSetting('sampleRate') : 44100 
        });
        return await audioContext.decodeAudioData(arrayBuffer);
    }

    async audioBufferToBlob(audioBuffer) {
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

    // MP3 Encoding function
    async encodeToMP3(audioBuffer, bitRate = 128) {
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

    // Session and sharing utilities
    generateSessionId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomStr}`;
    }

    generateShareUrl(sessionId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?lesson=${sessionId}`;
    }

    // Device detection utilities
    isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isLocalHost() {
        return location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1';
    }

    requiresHTTPS() {
        return this.isMobileDevice() && location.protocol !== 'https:' && !this.isLocalHost();
    }

    // File handling utilities
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Validation utilities
    validateFileFormat(file, allowedTypes) {
        return allowedTypes.includes(file.type);
    }

    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Audio constraints utilities
    getMobileAudioConstraints() {
        return {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
    }

    getDesktopAudioConstraints(microphoneId, sampleRate) {
        return {
            audio: {
                deviceId: microphoneId ? { exact: microphoneId } : undefined,
                sampleRate: sampleRate,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
    }

    getBasicAudioConstraints() {
        return { audio: true };
    }

    // Media recorder options utilities
    getMediaRecorderOptions() {
        const isMobile = this.isMobileDevice();
        let mediaRecorderOptions = {};
        
        if (isMobile) {
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
        
        return mediaRecorderOptions;
    }

    // Error message utilities
    getRecordingErrorMessage(error) {
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
        
        return errorMessage;
    }

    // Audio context utilities
    async createAudioContext(sampleRate = null) {
        const isMobile = this.isMobileDevice();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
            sampleRate: isMobile ? 44100 : (sampleRate || 44100)
        });
        
        // Resume audio context if suspended (mobile requirement)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        return audioContext;
    }

    // Cleanup utilities
    cleanupAudioResources(audioStream) {
        if (audioStream) {
            console.log('🧹 Cleaning up audio resources...');
            audioStream.getTracks().forEach(track => track.stop());
            return null;
        }
        return audioStream;
    }

    // Copy to clipboard utility
    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return Promise.resolve();
            } catch (error) {
                document.body.removeChild(textArea);
                return Promise.reject(error);
            }
        }
    }
}

// Export singleton instance
window.Utilities = Utilities;