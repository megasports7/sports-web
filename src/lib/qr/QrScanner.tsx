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

export type CameraState = 'requesting' | 'granted' | 'denied' | 'no-camera' | 'blocked' | 'error';

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
  // Raw failure reason for the diagnostics line in the 'error' UI below --
  // without it we cannot tell "no mediaDevices API" apart from an exotic
  // getUserMedia error name on a user's actual device.
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  // Bump to re-run the start effect below (the "Try again" path) without
  // unmounting the component -- remounting would also work but loses the
  // onScan closure wiring this component deliberately preserves.
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanupTrack: (() => void) | null = null;

    function stopStream() {
      cleanupTrack?.();
      cleanupTrack = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setFailureDetail('mediaDevices/getUserMedia API absent');
          setState('error');
        }
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        const msg = (err as Error)?.message;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') setState('denied');
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setState('no-camera');
        // NotReadableError: permission was granted but the OS/driver would
        // not hand over frames -- camera held by another app/tab, disabled
        // in OS privacy settings, or a broken driver. OverconstrainedError:
        // no device satisfies the request. Both are retryable device states,
        // not a missing secure context, so they share the 'blocked' UI.
        else if (name === 'NotReadableError' || name === 'OverconstrainedError') setState('blocked');
        else {
          setFailureDetail(
            `getUserMedia threw ${name || 'unknown'}${msg ? `: ${msg}` : ''}`,
          );
          setState('error');
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        setState('error');
        return;
      }
      // Autoplay-policy hardening: muted/playsInline as element PROPERTIES,
      // not just JSX attributes (React does not reliably set the muted
      // property, and an unmuted play() rejects outside a user gesture).
      // play() itself waits for metadata so frames exist before 'granted'.
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      // A granted-but-silent track (camera held by another tab/app, OS-level
      // block, virtual camera with no input) resolves getUserMedia yet
      // renders eternal black. Surface it with an actionable message instead
      // of leaving the user staring at a dark viewfinder.
      const [track] = stream.getVideoTracks();
      if (track) {
        const onSilence = () => {
          if (!cancelled) setState('blocked');
        };
        const onFrames = () => {
          if (!cancelled) setState('granted');
        };
        track.addEventListener('mute', onSilence);
        track.addEventListener('ended', onSilence);
        track.addEventListener('unmute', onFrames);
        cleanupTrack = () => {
          track.removeEventListener('mute', onSilence);
          track.removeEventListener('ended', onSilence);
          track.removeEventListener('unmute', onFrames);
        };
        if (track.muted) {
          setState('blocked');
          return;
        }
      }
      try {
        if (video.readyState < 1) {
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error('metadata timeout')), 10000);
            video.onloadedmetadata = () => {
              window.clearTimeout(timer);
              resolve();
            };
          });
        }
        await video.play();
      } catch {
        // Stream was acquired but never produced a picture (dead/virtual
        // camera) or playback was refused: release the camera and show the
        // retryable 'blocked' UI rather than the generic secure-context
        // message, which does not describe this situation.
        if (!cancelled) {
          stopStream();
          setState('blocked');
        }
        return;
      }
      if (cancelled) return;
      setState('granted');
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [retryKey]);

  useEffect(() => {
    if (state !== 'granted') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function tick() {
      // videoWidth is 0 until the first frame arrives -- dividing by it
      // would poison the canvas size and kill this loop, so wait it out.
      if (active && video!.readyState === video!.HAVE_ENOUGH_DATA && video!.videoWidth > 0) {
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
  if (state === 'blocked') {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-amber-700">
          The camera opened but is not sending any picture — it may be in use
          by another tab or app, blocked by the OS, or a virtual camera with
          no input.
        </p>
        <button
          type="button"
          className="mt-2 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            setState('requesting');
            setRetryKey((k) => k + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (state === 'error') {
    // Live environment facts, not guesses: protocol/secure-context and API
    // presence are evaluated in the user's own browser at render time, so a
    // screenshot of this message tells us exactly which precondition failed.
    const secure =
      typeof window !== 'undefined'
        ? `protocol=${window.location.protocol} secure=${String(window.isSecureContext)} mediaDevices=${String(
            !!navigator.mediaDevices,
          )} getUserMedia=${String(!!navigator.mediaDevices?.getUserMedia)}`
        : 'environment unknown';
    return (
      <p className={className ?? 'text-sm text-red-600'}>
        Could not access the camera. This requires a secure (HTTPS) connection and a browser that
        supports camera access.
        <br />
        <span className="text-xs opacity-80">
          Diagnostics: {secure}
          {failureDetail ? ` (${failureDetail})` : ''}
        </span>
      </p>
    );
  }

  return (
    <div className={className}>
      <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
