import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// For iOS standalone check
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const InstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Store the event for later use
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as NavigatorWithStandalone).standalone;
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle app install
  const handleInstall = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for user choice
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    // Clear the saved prompt
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  // Hide the prompt
  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-sm bg-slate-800 text-white rounded-lg shadow-lg p-4 flex flex-col items-start">
      <div className="flex w-full justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Install DeepWork Flowship</h3>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white"
        >
          &times;
        </button>
      </div>
      <p className="text-sm mb-3">Install this app on your device for easy access and offline use.</p>
      <div className="flex gap-2 self-end">
        <button 
          onClick={handleDismiss}
          className="px-3 py-1 text-sm rounded-md text-slate-300 hover:bg-slate-700"
        >
          Not now
        </button>
        <button 
          onClick={handleInstall}
          className="px-3 py-1 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt; 