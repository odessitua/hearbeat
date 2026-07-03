const MIN_RECORDING_SEC = 0.5;

export class RecordingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordingError';
  }
}

export async function recordAudio(maxSec: number = 20): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, maxSec * 1000);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.onerror = () => {
      clearTimeout(timeout);
      stream.getTracks().forEach((t) => t.stop());
      reject(new RecordingError('RECORD_FAILED'));
    };
    recorder.onstop = () => {
      clearTimeout(timeout);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (blob.size < 100) {
        reject(new RecordingError('AUDIO_TOO_SHORT'));
        return;
      }
      resolve(blob);
    };
    recorder.start();
  });
}

export function isSilentBlob(blob: Blob): boolean {
  return blob.size < 100;
}

export { MIN_RECORDING_SEC };

/** Play a recorded or demo audio blob in the browser. */
export function playAudioBlob(blob: Blob): HTMLAudioElement {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  void audio.play();
  return audio;
}

export interface RecordingSession {
  stop: () => void;
  promise: Promise<Blob>;
}

/** Start mic recording; call `stop()` when done (or wait for maxSec auto-stop). */
export function startRecordingSession(maxSec: number = 30): RecordingSession {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let timeoutId = 0;

  const promise = (async (): Promise<Blob> => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    recorder = mediaRecorder;
    const chunks: BlobPart[] = [];

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        stream?.getTracks().forEach((t) => t.stop());
      };

      timeoutId = window.setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, maxSec * 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      mediaRecorder.onerror = () => {
        cleanup();
        reject(new RecordingError('RECORD_FAILED'));
      };
      mediaRecorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size < 100) {
          reject(new RecordingError('AUDIO_TOO_SHORT'));
          return;
        }
        resolve(blob);
      };
      mediaRecorder.start();
    });
  })();

  const stop = () => {
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  return { stop, promise };
}
