/**
 * Returns a list of Media Devices that can be used as video inputs.
 *
 * @return {Promise<MediaDeviceInfo[]>} list of video devices
 */
export async function getVideoInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.error('ENumerating media devices is not supported.');
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter(device => device.kind === 'videoinput');
}

/**
 * Stops every track of a video input
 *
 * @param video video input that should be stopped
 */
export function stopVideoCapture(video) {
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => {
      track.stop();
    });
    video.srcObject = null;
  }
}

/**
 * Gets a video input device ID based on video input's label
 *
 * @param {string} label label of a video input
 * @return {Promise<string|null>} device ID of a video input with label `label`
 */
async function getDeviceIdForLabel(label) {
  const videoInputs = await getVideoInputs();

  for (let i = 0; i < videoInputs.length; i++) {
    const videoInput = videoInputs[i];
    if (videoInput.label === label) {
      return videoInput.deviceId;
    }
  }

  return null;
}

/**
 * Determines the object a camera is facing (i.e. is it a front or a back cam)
 *
 * @param {string} label
 * @return {'environment'|'user'} direction the camera is facing
 */
function getFacingMode(label) {
  if (!label) {
    return 'user';
  }
  if (label.toLowerCase().includes('back')) {
    return 'environment';
  } else {
    return 'user';
  }
}

/**
 * Gets constraints for a camera with a specified label
 *
 * @param {string} cameraLabel camera label
 * @return {Promise<MediaTrackConstraints>} device constraints
 */
async function getConstraints(cameraLabel) {
  let deviceId;

  if (cameraLabel) {
    deviceId = await getDeviceIdForLabel(cameraLabel);
  }

  return { deviceId, facingMode: 'user' };
}

/**
 * Loads a the camera to be used in the demo
 *
 * @param {HTMLVideoElement} videoElement
 * @param {string} cameraLabel camera label
 * @return {Promise<HTMLVideoElement>}
 */
export async function setupCamera(videoElement, cameraLabel) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Getting media devices is not supported.');
  }

  const videoConstraints = await getConstraints(cameraLabel);

  videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': videoConstraints,
  });

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.width = videoElement.videoWidth;
      videoElement.height = videoElement.videoHeight;
      resolve(videoElement);
    };
  });
}
