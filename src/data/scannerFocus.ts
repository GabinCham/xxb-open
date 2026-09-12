type Caps = MediaTrackCapabilities & {
  focusMode?: string[];
  focusDistance?: { min: number; max: number };
  torch?: boolean;
};

function videoTrackFrom(root: HTMLElement | null): MediaStreamTrack | null {
  const video = root?.querySelector('video') as HTMLVideoElement | null;
  const stream = video?.srcObject;
  if (!stream || !(stream instanceof MediaStream)) return null;
  return stream.getVideoTracks()[0] ?? null;
}

export async function applyScannerFocus(root: HTMLElement | null) {
  const track = videoTrackFrom(root);
  if (!track?.applyConstraints) return;
  const caps = (track.getCapabilities?.() ?? {}) as Caps;

  try {
    await track.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: { ideal: 'environment' },
    });
  } catch {
    /* device may reject size */
  }

  const advanced: Record<string, unknown> = {};
  if (caps.focusMode?.includes('continuous')) advanced.focusMode = 'continuous';
  else if (caps.focusMode?.includes('single-shot')) advanced.focusMode = 'single-shot';

  if (Object.keys(advanced).length) {
    try {
      await track.applyConstraints({ advanced: [advanced] });
    } catch {
      /* ignore unsupported AF */
    }
  }
}

export async function pulseAutofocus(root: HTMLElement | null) {
  const track = videoTrackFrom(root);
  if (!track?.applyConstraints) return;
  const caps = (track.getCapabilities?.() ?? {}) as Caps;
  if (!caps.focusMode?.length) return;

  try {
    if (caps.focusMode.includes('single-shot')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
    }
    if (caps.focusMode.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    }
  } catch {
    /* ignore */
  }
}
