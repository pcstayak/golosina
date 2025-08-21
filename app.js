// Initialize global module instances
let appState;
let configSettings;
let dataManager;
let audioManager;
let uiController;
let exportSharing;
let eventHandler;
let utilities;

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize all modules
    appState = new StateManager();
    configSettings = new ConfigSettings();
    dataManager = new DataManager();
    audioManager = new AudioManager();
    uiController = new UIController();
    exportSharing = new ExportSharing();
    eventHandler = new EventHandler();
    utilities = new Utilities();

    // Make instances available globally
    window.appState = appState;
    window.configSettings = configSettings;
    window.dataManager = dataManager;
    window.audioManager = audioManager;
    window.uiController = uiController;
    window.exportSharing = exportSharing;
    window.eventHandler = eventHandler;
    window.utilities = utilities;

    // Initialize application
    configSettings.loadSettings();
    await audioManager.initializeAudioDevices();
    uiController.showLanding();
    uiController.updateExportButton();
    eventHandler.setupEventListeners();
    eventHandler.setupGlobalFunctionWrappers();
    audioManager.initializeMobileSupport();
    
    // Check for shared lesson in URL parameters
    await exportSharing.handleSharedLesson();
});