/**
 * Screen capture utilities for streaming display media
 */

export interface ScreenCaptureOptions {
  audio?: boolean;
  video?: MediaTrackConstraints | boolean;
}

/**
 * Request screen capture from user
 * @param options Capture options
 * @returns Promise with MediaStream
 */
export const captureScreen = async (
  options?: ScreenCaptureOptions
): Promise<MediaStream> => {
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen capture is not supported in this browser');
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: options?.audio || false,
      video: (options?.video || {
        cursor: 'always',
        frameRate: 30,
      }) as any,
    });

    console.log('Screen captured successfully');
    return stream;
  } catch (error) {
    console.error('Error capturing screen:', error);
    throw error;
  }
};

/**
 * Get camera stream
 * @param options Capture options
 * @returns Promise with MediaStream
 */
export const getCameraStream = async (
  options?: ScreenCaptureOptions
): Promise<MediaStream> => {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not supported in this browser');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options?.audio || false,
      video: options?.video || {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    console.log('Camera stream acquired');
    return stream;
  } catch (error) {
    console.error('Error getting camera stream:', error);
    throw error;
  }
};

/**
 * Stop all tracks in a media stream
 * @param stream MediaStream to stop
 */
export const stopStream = (stream: MediaStream): void => {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
  console.log('Stream stopped');
};

/**
 * Set stream as video element source
 * @param videoElement HTML video element
 * @param stream MediaStream
 */
export const setVideoElementStream = (
  videoElement: HTMLVideoElement,
  stream: MediaStream
): void => {
  videoElement.srcObject = stream;
};

/**
 * Get screen dimensions
 * @returns Object with width and height
 */
export const getScreenDimensions = (): { width: number; height: number } => {
  return {
    width: window.screen.width,
    height: window.screen.height,
  };
};
