import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { t } from '@/text';

/**
 * Visor d'imatge a pantalla completa (lightbox), com la galeria del mòbil.
 *
 * Un sol overlay viu a l'arrel de l'app (muntat pel `ImageViewerProvider`). Qualsevol
 * `<img>` de l'app l'obre cridant `useImageViewer().open(url, alt)` — normalment via el
 * component `Photo`.
 *
 * Gestos (sense botons):
 *  - pinch amb dos dits → zoom; doble-toc → alterna 1×/2.5×.
 *  - amb zoom, un dit arrossega (pan) dins la imatge.
 *  - a escala 1×, arrossegar avall tanca (com la galeria); toc al fons negre tanca.
 *  - el botó "enrere" del sistema també tanca (gestionat amb history.pushState/popstate).
 */

interface ImageViewerContextValue {
  open: (src: string, alt?: string) => void;
}

const ImageViewerContext = createContext<ImageViewerContextValue | null>(null);

/** Hook per obrir el visor des de qualsevol component. */
export function useImageViewer(): ImageViewerContextValue {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) throw new Error('useImageViewer fora de ImageViewerProvider');
  return ctx;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Llindar d'arrossegament vertical (px, amunt o avall) per tancar quan l'escala és 1.
const CLOSE_DRAG = 110;
// Temps màxim (ms) entre tocs per comptar com a doble-toc.
const DOUBLE_TAP_MS = 280;

interface ViewerState {
  src: string;
  alt: string;
}

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState | null>(null);

  const open = useCallback((src: string, alt = '') => {
    setState({ src, alt });
  }, []);

  const close = useCallback(() => setState(null), []);

  // Integració amb el botó "enrere" del sistema, lligada a si hi ha un visor obert (no al
  // muntatge de l'overlay). Així evita el doble-muntatge d'effects de StrictMode: en arrencar
  // l'app `state` és null i el cos no fa res. Quan s'obre el visor, empenyem una entrada
  // d'historial; el botó enrere dispara popstate → tanquem. Si es tanca per un altre gest,
  // el cleanup consumeix l'entrada amb history.back() (marcat com a propi per no re-tancar).
  const open_ = state !== null;
  const selfBack = useRef(false);
  useEffect(() => {
    if (!open_) return;
    history.pushState({ imageViewer: true }, '');
    const onPop = () => {
      if (selfBack.current) {
        selfBack.current = false;
        return;
      }
      setState(null);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Si l'entrada que vam empènyer encara és a dalt (no s'ha tancat amb el botó enrere),
      // la consumim. Comprovem history.state per no fer un back de més.
      if (history.state?.imageViewer) {
        selfBack.current = true;
        history.back();
      }
    };
  }, [open_]);

  return (
    <ImageViewerContext.Provider value={{ open }}>
      {children}
      {state && <ViewerOverlay src={state.src} alt={state.alt} onClose={close} />}
    </ImageViewerContext.Provider>
  );
}

/** Distància entre dos punters (per al pinch). */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ViewerOverlay({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  // Transformació actual de la imatge.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  // Opacitat del fons mentre s'arrossega avall per tancar (feedback visual).
  const [bgOpacity, setBgOpacity] = useState(1);
  // El mateix toc que obre el visor encara està "viu" (pointerup/click pendents). Ignorem
  // qualsevol interacció de tancament fins que el toc d'obertura s'ha consumit del tot.
  const ready = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      ready.current = true;
    }, 200);
    return () => clearTimeout(id);
  }, []);

  // Punters actius (per distingir 1 dit = pan/swipe vs 2 dits = pinch).
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Estat del gest en curs.
  const gesture = useRef<{
    startScale: number;
    startTx: number;
    startTy: number;
    startDist: number;
    startX: number;
    startY: number;
    mode: 'none' | 'pan' | 'pinch';
  }>({ startScale: 1, startTx: 0, startTy: 0, startDist: 0, startX: 0, startY: 0, mode: 'none' });
  const lastTap = useRef(0);

  // (El botó "enrere" del sistema el gestiona el Provider, lligat a si hi ha visor obert, per
  // ser segur amb el doble-muntatge d'effects de StrictMode.)

  // Escape tanca (escriptori).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Bloqueja l'scroll del body mentre el visor és obert.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function resetTransform() {
    setScale(1);
    setTx(0);
    setTy(0);
    setBgOpacity(1);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (!ready.current) return; // ignora el toc d'obertura encara viu
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length === 2) {
      gesture.current = {
        startScale: scale,
        startTx: tx,
        startTy: ty,
        startDist: distance(pts[0]!, pts[1]!),
        startX: 0,
        startY: 0,
        mode: 'pinch',
      };
    } else if (pts.length === 1) {
      gesture.current = {
        startScale: scale,
        startTx: tx,
        startTy: ty,
        startDist: 0,
        startX: e.clientX,
        startY: e.clientY,
        mode: 'pan',
      };
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;

    if (g.mode === 'pinch' && pts.length >= 2) {
      const d = distance(pts[0]!, pts[1]!);
      const next = Math.min(MAX_SCALE, Math.max(1, (g.startScale * d) / g.startDist));
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
    } else if (g.mode === 'pan' && pts.length === 1) {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (scale > 1) {
        // Amb zoom: arrossegar mou la imatge (pan).
        setTx(g.startTx + dx);
        setTy(g.startTy + dy);
      } else {
        // A escala 1: arrossegar amunt o avall acosta al tancament (com la galeria).
        setTy(dy);
        setBgOpacity(Math.max(0.3, 1 - Math.abs(dy) / 400));
      }
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    // Final d'un swipe vertical (amunt o avall) a escala 1: tancar o tornar.
    if (g.mode === 'pan' && scale === 1) {
      if (Math.abs(ty) > CLOSE_DRAG) {
        onClose();
        return;
      }
      // No arriba al llindar: torna a lloc.
      setTy(0);
      setBgOpacity(1);
    }

    if (pointers.current.size === 0) {
      gesture.current.mode = 'none';
    } else if (pointers.current.size === 1) {
      // Queda un dit després d'un pinch: reprèn com a pan des de la posició actual.
      const p = [...pointers.current.values()][0]!;
      gesture.current = {
        startScale: scale,
        startTx: tx,
        startTy: ty,
        startDist: 0,
        startX: p.x,
        startY: p.y,
        mode: 'pan',
      };
    }
  }

  function onTap() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Doble-toc: alterna entre 1× i ampliat.
      if (scale > 1) resetTransform();
      else setScale(DOUBLE_TAP_SCALE);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  // A escala 1, un clic simple al fons tanca (després de descartar doble-toc).
  function onBackgroundClick() {
    if (!ready.current) return; // ignora el clic d'obertura encara viu
    if (scale === 1 && ty === 0) onClose();
  }

  const dragging = gesture.current.mode !== 'none';

  return (
    <div
      className="fixed inset-0 z-[60] flex touch-none items-center justify-center overflow-hidden"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity})` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onBackgroundClick}
      role="dialog"
      aria-modal="true"
      aria-label={t.viewer.label}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          onTap();
        }}
        className="max-h-full max-w-full select-none object-contain"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 200ms ease-out',
        }}
      />
    </div>
  );
}
