'use client';

/**
 * Shared camera-based QR scanner, used identically by all three organizer
 * scanning pages (scan-attendance, rapid-mode, list scan) and identically
 * across device types -- there is no separate "phone" vs "laptop" code path.
 * getUserMedia treats a laptop's built-in webcam the same as a phone's
 * camera; `facingMode: {ideal: 'environment'}` is a *preference* (rear
 * camera on a phone), not a requirement, so it degrades gracefully to
 * whatever camera a laptop has instead of failing.
 *
 * Decodes with jsQR (small, dependency-free, works in every browser
 * including Safari/iOS) rather than the native BarcodeDetector API, which
 * is unsupported in Safari/iOS entirely -- using it would either break
 * scanning for a large share of real users or require a second fallback
 * path, which is more complexity, not less.
 */
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export type CameraState = 'requesting' | 'granted' | 'denied' | 'no-camera' | 'error';

interface QrScannerProps {
  /** Called once per newly-seen distinct QR value -- repeat frames of the
   *  same still-visible code do not re-fire until the code leaves frame and
   *  comes back (possibly as the same value again). Page-level debounce
   *  (e.g. "ignore scans for 1.5s after a successful one") is a separate,
   *  business-logic concern each page owns for itself. */
  onScan: (text: string) => void;
  /** Pause decoding without tearing down the camera stream (cheap to
   *  resume) -- e.g. while a page is showing a result and not yet ready
   *  for the next scan. Defaults to true. */
  active?: boolean;
  className?: string;
}

export function QrScanner({ onScan, active = true, className }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastValueRef = useRef<string | null>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const [state, setState] = useState<CameraState>('requesting');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('error');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState('granted');
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') setState('denied');
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setState('no-camera');
        else setState('error');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state !== 'granted') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function tick() {
      if (active && video!.readyState === video!.HAVE_ENOUGH_DATA) {
        // Downscaled decode target -- full camera resolution is unnecessary
        // for a QR code held reasonably close and wastes CPU/battery.
        const targetWidth = 480;
        const scale = targetWidth / video!.videoWidth;
        canvas!.width = targetWidth;
        canvas!.height = Math.round(video!.videoHeight * scale);
        ctx!.drawImage(video!, 0, 0, canvas!.width, canvas!.height);
        const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          if (code.data !== lastValueRef.current) {
            lastValueRef.current = code.data;
            onScanRef.current(code.data);
          }
        } else {
          lastValueRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, active]);

  if (state === 'requesting') {
    return <p className={className ?? 'text-sm text-gray-500'}>Requesting camera access…</p>;
  }
  if (state === 'denied') {
    return (
      <p className={className ?? 'text-sm text-red-600'}>
        Camera access denied. Your browser usually will not re-prompt automatically — check the
        camera permission for this site in your browser&apos;s address-bar / site-settings icon, then
        reload this page.
      </p>
    );
  }
  if (state === 'no-camera') {
    return <p className={className ?? 'text-sm text-red-600'}>No camera was found on this device.</p>;
  }
  if (state === 'error') {
    return (
      <p className={className ?? 'text-sm text-red-600'}>
        Could not access the camera. This requires a secure (HTTPS) connection and a browser that
        supports camera access.
      </p>
    );
  }

  return (
    <div className={className}>
      <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
