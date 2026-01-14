import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface FFmpegProgress {
  progress: number;
  time: number;
  message: string;
}

// Helper to convert FFmpeg FileData to Blob
function createBlobFromData(data: Uint8Array | string, type: string): Blob {
  if (typeof data === 'string') {
    return new Blob([data], { type });
  }
  // Create a new Uint8Array to ensure proper type
  const bytes = new Uint8Array(data);
  return new Blob([bytes], { type });
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<FFmpegProgress>({ progress: 0, time: 0, message: '' });

  const load = useCallback(async () => {
    if (ffmpegRef.current && loaded) return;
    
    setLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      ffmpeg.on('progress', ({ progress, time }) => {
        setProgress({
          progress: Math.round(progress * 100),
          time,
          message: `Processing: ${Math.round(progress * 100)}%`
        });
      });

      // Load FFmpeg core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setLoaded(true);
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  const trimVideo = useCallback(async (
    inputUrl: string,
    startTime: number,
    endTime: number
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    const duration = endTime - startTime;
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const changeSpeed = useCallback(async (
    inputUrl: string,
    speed: number
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    // Video speed: setpts filter (lower = faster)
    // Audio speed: atempo filter
    const videoFilter = `setpts=${1/speed}*PTS`;
    const audioFilter = speed >= 0.5 && speed <= 2 ? `atempo=${speed}` : 
      speed < 0.5 ? `atempo=0.5,atempo=${speed/0.5}` : `atempo=2,atempo=${speed/2}`;

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-filter:v', videoFilter,
      '-filter:a', audioFilter,
      '-y',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const addAudio = useCallback(async (
    videoUrl: string,
    audioUrl: string,
    volume: number = 1,
    mixOriginal: boolean = true
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const videoData = await fetchFile(videoUrl);
    const audioData = await fetchFile(audioUrl);
    
    await ffmpeg.writeFile('video.mp4', videoData);
    await ffmpeg.writeFile('audio.mp3', audioData);

    if (mixOriginal) {
      // Mix both audio tracks
      await ffmpeg.exec([
        '-i', 'video.mp4',
        '-i', 'audio.mp3',
        '-filter_complex', `[0:a]volume=1[a0];[1:a]volume=${volume}[a1];[a0][a1]amix=inputs=2:duration=first`,
        '-c:v', 'copy',
        '-y',
        'output.mp4'
      ]);
    } else {
      // Replace original audio
      await ffmpeg.exec([
        '-i', 'video.mp4',
        '-i', 'audio.mp3',
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-shortest',
        '-y',
        'output.mp4'
      ]);
    }

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const applyFilter = useCallback(async (
    inputUrl: string,
    filterName: string
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    let filterArgs: string[] = [];
    
    switch (filterName) {
      case 'grayscale':
        filterArgs = ['-vf', 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3'];
        break;
      case 'sepia':
        filterArgs = ['-vf', 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'];
        break;
      case 'vintage':
        filterArgs = ['-vf', 'curves=vintage'];
        break;
      case 'contrast':
        filterArgs = ['-vf', 'eq=contrast=1.3'];
        break;
      case 'brightness':
        filterArgs = ['-vf', 'eq=brightness=0.1'];
        break;
      case 'blur':
        filterArgs = ['-vf', 'gblur=sigma=5'];
        break;
      case 'sharpen':
        filterArgs = ['-vf', 'unsharp=5:5:1.0:5:5:0.0'];
        break;
      case 'vignette':
        filterArgs = ['-vf', 'vignette=PI/4'];
        break;
      case 'cinematic':
        filterArgs = ['-vf', 'eq=contrast=1.1:saturation=0.9,curves=preset=darker'];
        break;
      case 'warm':
        filterArgs = ['-vf', 'colortemperature=temperature=6500'];
        break;
      case 'cool':
        filterArgs = ['-vf', 'colortemperature=temperature=8500'];
        break;
      default:
        filterArgs = [];
    }

    if (filterArgs.length > 0) {
      await ffmpeg.exec([
        '-i', 'input.mp4',
        ...filterArgs,
        '-c:a', 'copy',
        '-y',
        'output.mp4'
      ]);
    } else {
      await ffmpeg.exec(['-i', 'input.mp4', '-c', 'copy', '-y', 'output.mp4']);
    }

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const extractAudio = useCallback(async (inputUrl: string): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn',
      '-acodec', 'libmp3lame',
      '-y',
      'output.mp3'
    ]);

    const data = await ffmpeg.readFile('output.mp3') as Uint8Array;
    const blob = createBlobFromData(data, 'audio/mp3');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const removeAudio = useCallback(async (inputUrl: string): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'copy',
      '-an',
      '-y',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const reverseVideo = useCallback(async (inputUrl: string): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', 'reverse',
      '-af', 'areverse',
      '-y',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const cropVideo = useCallback(async (
    inputUrl: string,
    width: number,
    height: number,
    x: number,
    y: number
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `crop=${width}:${height}:${x}:${y}`,
      '-c:a', 'copy',
      '-y',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  const resizeVideo = useCallback(async (
    inputUrl: string,
    width: number,
    height: number
  ): Promise<string> => {
    if (!ffmpegRef.current || !loaded) {
      await load();
    }
    
    const ffmpeg = ffmpegRef.current!;
    const inputData = await fetchFile(inputUrl);
    await ffmpeg.writeFile('input.mp4', inputData);

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', `scale=${width}:${height}`,
      '-c:a', 'copy',
      '-y',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
    const blob = createBlobFromData(data, 'video/mp4');
    return URL.createObjectURL(blob);
  }, [loaded, load]);

  return {
    loaded,
    loading,
    progress,
    load,
    trimVideo,
    changeSpeed,
    addAudio,
    applyFilter,
    extractAudio,
    removeAudio,
    reverseVideo,
    cropVideo,
    resizeVideo,
  };
}
