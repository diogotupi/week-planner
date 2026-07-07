import finishedUrl from '../assets/task-finished.wav';
import notificationUrl from '../assets/task-notification.wav';

const sounds = new Map<string, { ctx: AudioContext; buffer: AudioBuffer }>();
const loadPromises = new Map<string, Promise<void>>();

function getAudioContext(): AudioContext {
  return new AudioContext();
}

async function loadSound(url: string): Promise<void> {
  if (sounds.has(url)) return;
  if (loadPromises.has(url)) return loadPromises.get(url)!;

  const promise = (async () => {
    const context = getAudioContext();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sound not found (${response.status})`);
    const data = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(data);
    sounds.set(url, { ctx: context, buffer });
  })();

  loadPromises.set(url, promise);
  return promise;
}

function unlockSound(url: string): void {
  void (async () => {
    try {
      await loadSound(url);
      const entry = sounds.get(url);
      if (entry?.ctx.state === 'suspended') await entry.ctx.resume();
    } catch {
      // ignore
    }
  })();
}

function playSound(url: string): void {
  void (async () => {
    try {
      await loadSound(url);
      const entry = sounds.get(url);
      if (!entry) return;
      if (entry.ctx.state === 'suspended') await entry.ctx.resume();
      const source = entry.ctx.createBufferSource();
      source.buffer = entry.buffer;
      source.connect(entry.ctx.destination);
      source.start(0);
    } catch {
      try {
        const audio = new Audio(url);
        audio.currentTime = 0;
        await audio.play();
      } catch {
        // ignore
      }
    }
  })();
}

export function unlockTaskSounds(): void {
  unlockSound(finishedUrl);
  unlockSound(notificationUrl);
}

export function playTaskFinishedSound(): void {
  playSound(finishedUrl);
}

export function playTaskNotificationSound(): void {
  playSound(notificationUrl);
}
