import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Gestiona la instal·lació de la PWA.
 *
 * A Android/Chrome es captura `beforeinstallprompt` i s'ofereix un botó. A iOS no hi ha
 * prompt programàtic: es detecta el dispositiu per mostrar instruccions de "Afegir a la
 * pantalla d'inici". PLA.md secció 10.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window.navigator as { standalone?: boolean }).standalone;

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return { canInstall: !!deferred, promptInstall, isIOS };
}
