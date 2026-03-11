import React, { useState, useRef, useEffect, useCallback } from 'react';

export function useFullscreenLightbox() {
  const [fsUrl, setFsUrl] = useState<string | null>(null);
  const [fsZoom, setFsZoom] = useState(1);
  const [fsPan, setFsPan] = useState({ x: 0, y: 0 });
  const [fsIsLandscape, setFsIsLandscape] = useState<boolean | null>(null);
  const [fsScreenLandscape, setFsScreenLandscape] = useState(() => window.innerWidth > window.innerHeight);
  const fsOverlayRef = useRef<HTMLDivElement>(null);
  const fsGesture = useRef<{ dist?: number; zoom?: number; lastX?: number; lastY?: number }>({});
  const fsLiveRef = useRef({ zoom: 1, panX: 0, panY: 0 });

  useEffect(() => { fsLiveRef.current = { zoom: fsZoom, panX: fsPan.x, panY: fsPan.y }; }, [fsZoom, fsPan]);

  const openFullscreen = useCallback(async (url: string) => {
    setFsUrl(url);
    setFsZoom(1);
    setFsPan({ x: 0, y: 0 });
    setFsIsLandscape(null);
    try { await document.documentElement.requestFullscreen?.(); } catch { }
  }, []);

  const closeFullscreen = useCallback(() => {
    setFsUrl(null);
    setFsZoom(1);
    setFsPan({ x: 0, y: 0 });
    setFsIsLandscape(null);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { }
    try { (screen.orientation as any)?.unlock?.(); } catch { }
  }, []);

  // Track screen orientation changes
  useEffect(() => {
    if (!fsUrl) return;
    const update = () => setFsScreenLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, [fsUrl]);

  // When Android's back button exits fullscreen, close the lightbox overlay
  useEffect(() => {
    if (!fsUrl) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFsUrl(null);
        setFsZoom(1);
        setFsPan({ x: 0, y: 0 });
        setFsIsLandscape(null);
        try { (screen.orientation as any)?.unlock?.(); } catch { }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fsUrl]);

  // Detect image orientation and try to lock screen orientation
  const handleFsImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const landscape = naturalWidth > naturalHeight;
    setFsIsLandscape(landscape);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      try { (screen.orientation as any)?.lock?.(landscape ? 'landscape' : 'portrait').catch(() => { }); } catch { }
    }
  }, []);

  // Imperative non-passive touch handler
  useEffect(() => {
    const el = fsOverlayRef.current;
    if (!el || !fsUrl) return;

    const dist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        fsGesture.current = { dist: dist(e.touches), zoom: fsLiveRef.current.zoom };
      } else {
        fsGesture.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY, zoom: fsLiveRef.current.zoom };
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const { zoom: startZoom, dist: startDist, lastX, lastY } = fsGesture.current;
      if (e.touches.length === 2 && startDist != null) {
        const newZoom = Math.min(10, Math.max(1, startZoom! * (dist(e.touches) / startDist)));
        setFsZoom(newZoom);
        fsLiveRef.current.zoom = newZoom;
      } else if (e.touches.length === 1 && lastX != null) {
        const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY!;
        fsGesture.current.lastX = e.touches[0].clientX;
        fsGesture.current.lastY = e.touches[0].clientY;
        setFsPan(p => ({ x: p.x + dx / fsLiveRef.current.zoom, y: p.y + dy / fsLiveRef.current.zoom }));
      }
    };

    const onEnd = () => {
      fsGesture.current = {};
      setFsZoom(z => { if (z < 1.05) { setFsPan({ x: 0, y: 0 }); return 1; } return z; });
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [fsUrl]);

  // Desktop wheel zoom
  const handleFsWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setFsZoom(z => Math.min(10, Math.max(1, z - e.deltaY * 0.001 * z)));
  }, []);

  const fsNeedsRotation = typeof window !== 'undefined' && window.innerWidth < 768 && fsIsLandscape !== null && fsIsLandscape !== fsScreenLandscape;

  return {
    fsUrl,
    fsZoom,
    fsPan,
    fsOverlayRef,
    fsNeedsRotation,
    openFullscreen,
    closeFullscreen,
    handleFsImageLoad,
    handleFsWheel,
    setFsZoom,
    setFsPan,
  };
}
