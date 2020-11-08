import { bodyPartMapStore, bodyStatusStore, lightningStatusStore } from './store/pose';
import { drawLine, drawPoint } from './draw';
import {checkInterval, intervalValues} from './store/settings/checkInterval';
import isFocused from './store/isFocused';

/**
 * Pose
 *
 * @typedef {import('@tensorflow-models/posenet/dist/types').Pose} Pose
 */

/**
 * 2D vector
 *
 * @typedef {import('@tensorflow-models/posenet/dist/types').Vector2D} Vector2D
 */

/**
 *
 * @param {Pose} pose
 * @param {(string|number)[]} toExtract keypoints to extract
 * @return {{(key: string): Vector2D}} body part to location vector map
 */
function extractBodyPartPositions(pose, toExtract) {
  const result = {};
  pose.keypoints.forEach((keypoint, idx) => {
    if (toExtract.includes(idx) || toExtract.includes(keypoint.part)) {
      result[keypoint.part] = keypoint.position;
    }
  });
  return result;
}

/**
 *
 * @param {Vector2D} point1
 * @param {Vector2D} point2
 * @param {number} threshold
 * @param {"x"|"y"} toCheck
 * @return {"good"|"bad"|null}
 */
function checkDiffBetweenPoints(point1 = null, point2 = null, threshold, toCheck = 'y') {
  if (point1 && point2) {
    return Math.abs(point1[toCheck] - point2[toCheck]) <= threshold ? 'good' : 'bad';
  }
  return null;
}

/**
 *
 * @param {dict} bodyPartMap
 * @param {number} width
 * @return {number}
 */
function computeMonitorDistance(bodyPartMap, width) {
  var dist = null;

  // First order
  if (bodyPartMap.leftEye && bodyPartMap.rightEye) {
    var eye_dist = Math.abs(bodyPartMap.leftEye['x'] - bodyPartMap.rightEye['x']);

    // Second order
    if (bodyPartMap.leftEar && bodyPartMap.rightEar) {
      const ear_center = (bodyPartMap.leftEar['x'] + bodyPartMap.rightEar['x']) / 2;
      const eye_center = (bodyPartMap.leftEye['x'] + bodyPartMap.rightEye['x']) / 2;
      const diff = 0.5 * Math.abs(ear_center - eye_center);

      eye_dist += diff;
    }

    const magic_const = 6;
    dist = magic_const * width / eye_dist ;
  }
  return dist;
}

/**
 *
 * @param {dict} bodyPartMap
 * @param {number} height
 * @return {number}
 */
function computeViewAngle(bodyPartMap, height) {
  var alpha = null;

  // First order
  if (bodyPartMap.leftEye && bodyPartMap.rightEye) {
    const eye_center = (bodyPartMap.leftEye['y'] + bodyPartMap.rightEye['y']) / 2;

    const camera_view_angle = 70;
    alpha = 90 + 180 * Math.asin(Math.sin(camera_view_angle / 2) * (2 * eye_center / height - 1)) / Math.PI;
  }
  return alpha;
}

/**
 *
 * @param {{(key: string): Vector2D}} bodyPartMap body part to location vector map
 */
function calculateBodyStatus(bodyPartMap, input) {
  const result = {
    shouldersAngle: null,
    eyesAngle: null,
    monitorDistance: null,
    monitorPosition: null,
  };

  result.shouldersAngle = checkDiffBetweenPoints(bodyPartMap.leftShoulder, bodyPartMap.rightShoulder, 50);
  result.eyesAngle = checkDiffBetweenPoints(bodyPartMap.leftEye, bodyPartMap.rightEye, 120, 'x');
  result.monitorDistance = computeMonitorDistance(bodyPartMap, input.width);
  result.viewAngle = computeViewAngle(bodyPartMap, input.height, result.monitorDistance);

  return result
}


function calculateLightningStatus(canvasCtx, bodyPartMap, width, height) {
  let leftEarPos = bodyPartMap["leftEar"];
  let rightEarPos = bodyPartMap["rightEar"];
  let leftShoulderPos = bodyPartMap["leftShoulder"];
  let rightShoulderPos = bodyPartMap["rightShoulder"];

  if (leftEarPos === -1 || rightEarPos === -1) {
    return true
  }

  // const faceHeight = Math.abs(leftEarPos.y - rightEarPos.y);
  const faceHeight = rightEarPos.x - leftEarPos.x; // Face's height is at least face's width
  const faceCenterY = (leftEarPos.y + rightEarPos.y) / 2;

  // // calculate mean face intensity
  // let facePixels = 0;
  // let facePixelsIntensityCum = 0;
  // for (let i = leftEarPos.x; i <= rightEarPos.x; i++) {
  //   for (let j = faceCenterY - faceHeight / 2.0; j < faceCenterY + faceHeight / 2.0; j++) {
  //     const pixel = canvasCtx.getImageData(i, j, 1, 1);
  //     const intensity = (pixel.data[0] + pixel.data[1] + pixel.data[2]) / 3;
  //
  //     facePixelsIntensityCum += intensity;
  //     facePixels++;
  //   }
  // }
  // let facePixelsIntensity = facePixelsIntensityCum / facePixels;
  //
  // // calculate mean background intensity
  // let backgroundPixels = 0;
  // let backgroundPixelsIntensityCum = 0;
  // for (let i = 0; i <= width; i+=10) {
  //   if (i > leftShoulderPos.x && i < rightShoulderPos.x)
  //     continue;
  //   for (let j = 0; j < height; j+=10) {
  //     if (j < faceCenterY + faceHeight / 2.0)
  //       continue;
  //     const pixel = canvasCtx.getImageData(i, j, 1, 1);
  //     const intensity = (pixel.data[0] + pixel.data[1] + pixel.data[2]) / 3;
  //
  //     backgroundPixelsIntensityCum += intensity;
  //     backgroundPixels++;
  //   }
  // }
  // backgroundPixelsIntensityCum -= facePixelsIntensityCum; // Background is everything on image except of face
  // const backgroundPixelsIntensity = backgroundPixelsIntensityCum / backgroundPixels;

  // return "back " + backgroundPixelsIntensity.toString() + "  front " + facePixelsIntensity.toString(); // for debug

  // return facePixelsIntensity <= 1.05 * backgroundPixelsIntensity ? 'good' : 'bad' // Initial idea

  // calculate mean image intensity
  let imagePixels = 0;
  let imagePixelsIntensityCum = 0;
  for (let i = 0; i <= width; i+=10) { // step === 10 is to make code faster
    for (let j = 0; j < height; j+=10) {
      const pixel = canvasCtx.getImageData(i, j, 1, 1);
      const intensity = (pixel.data[0] + pixel.data[1] + pixel.data[2]) / 3;

      imagePixelsIntensityCum += intensity;
      imagePixels++;
    }
  }
  const imagePixelsIntensity = imagePixelsIntensityCum / imagePixels;

  var ret = {
    status: null
  }
  // return imagePixelsIntensity.toString()
  if (imagePixelsIntensity < 90)
    ret.status = "bad"
  else
    if (imagePixelsIntensity < 120)
      ret.status = "good";
    else
      if (imagePixelsIntensity >= 120)
        ret.status = "perfect";

  return ret;
}


/**
 * @param {CustomPoseNet} net
 * @param {HTMLVideoElement|HTMLCanvasElement} input
 * @param {HTMLCanvasElement} output
 */
export function calculatePoseInRealTime(net,
                                        input,
                                        output) {
  let checkIntervalInMs = 0;
  checkInterval.subscribe(val => {
    checkIntervalInMs = intervalValues[val].time;
  })

  let focused = true;
  isFocused.subscribe(val => {
    focused = val;
  })

  const inputCanvas = document.createElement('canvas');
  inputCanvas.height = input.videoHeight;
  inputCanvas.width = input.videoWidth;
  const inputCtx = inputCanvas.getContext('2d');


  const ctx = output.getContext('2d');
  const flip = net.flipHorizontal;
  const marker_list = [
    'leftEar',
    'rightEar',
    'leftEye',
    'rightEye',
    'leftShoulder',
    'rightShoulder',
  ];

  output.width = input.width;
  output.height = input.height;

  var prediction_history = [];

  let lastCheckTimestamp;

  async function drawFrame(timestamp) {
    if (!focused) {
      if (!lastCheckTimestamp) {
        lastCheckTimestamp = timestamp;
      }
      const elapsed = timestamp - lastCheckTimestamp;
      if (elapsed < checkIntervalInMs) {
        return requestAnimationFrame(drawFrame);
      } else {
        lastCheckTimestamp = timestamp;
      }
    }

    const pose = await net.estimatePose(input);

    ctx.clearRect(0, 0, input.width, input.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-input.width, 0);
    ctx.drawImage(input, 0, 0, input.width, input.height);
    ctx.restore();

    if (pose.score >= 0.15) {
      const currentBodyPartMap = extractBodyPartPositions(pose, marker_list);

      prediction_history.push(currentBodyPartMap)
      if (prediction_history.length > 8) {
        prediction_history.shift();
      }

      var bodyPartMap = {};
      var marker;
      for (marker in prediction_history[0]) {
        bodyPartMap[marker] = {};
        bodyPartMap[marker]['x'] = 0;
        bodyPartMap[marker]['y'] = 0;

        for (var i = 0; i < prediction_history.length; i++) {
          bodyPartMap[marker]['x'] += prediction_history[i][marker].x;
          bodyPartMap[marker]['y'] += prediction_history[i][marker].y;
        }

        bodyPartMap[marker]['x'] /= prediction_history.length;
        bodyPartMap[marker]['y'] /= prediction_history.length;
      }

      bodyPartMapStore.set(bodyPartMap);
      const bodyStatus = calculateBodyStatus(bodyPartMap, input);
      bodyStatusStore.set(bodyStatus);
      inputCtx.drawImage(input, 0, 0, inputCanvas.width, inputCanvas.height);
      const lightningStatus = calculateLightningStatus(inputCtx, bodyPartMap, inputCanvas.width, inputCanvas.height);
      lightningStatusStore.set(lightningStatus);

      Object.keys(bodyPartMap).forEach(bodyPart => {
        drawPoint(ctx, bodyPartMap[bodyPart]['y'], bodyPartMap[bodyPart]['x']);
      });

      drawLine(ctx,
        bodyPartMap['rightShoulder']['y'],
        bodyPartMap['rightShoulder']['x'],
        bodyPartMap['leftShoulder']['y'],
        bodyPartMap['leftShoulder']['x'],
      );
    } else {
      bodyStatusStore.set({
        shouldersAngle: null,
        eyesAngle: null,
        monitorDistance: null,
      });
    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}
