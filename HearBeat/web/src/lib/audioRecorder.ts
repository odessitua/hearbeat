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
