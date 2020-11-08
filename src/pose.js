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
 * @param {Vector2D} point1
 * @param {Vector2D} point2
 * @param {number} width
 * @param {"x"|"y"} toCheck
 * @return {number}
 */
function computeMonitorDistance(point1 = null, point2 = null, width, toCheck = 'x') {
  if (point1 && point2) {
    // 2473000 is a magic constant
    return 2473000 / Math.abs(point1[toCheck] - point2[toCheck]) / width;
  }
  return null;

  /**
 *
 * @param {Vector2D} leftEye
 * @param {Vector2D} rightEye
 * @param {number} height
 * @return {number}
 */
}function computeMonitorPosition(leftEye = null, rightEye = null, height) {
  if (leftEye && rightEye) {
    let eyeCenterY = (leftEye.y + rightEye.y) / 2;
    return ((eyeCenterY - height / 2) / height).toString(); // Normalized distance to center of screen
  }
  return null;
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
  result.monitorDistance = computeMonitorDistance(bodyPartMap.leftEye, bodyPartMap.rightEye, input.width);
  result.monitorPosition = computeMonitorPosition(bodyPartMap.leftEye, bodyPartMap.rightEye, input.height);

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
  // return imagePixelsIntensity.toString()
  if (imagePixelsIntensity < 90)
    return "bad";
  else
    if (imagePixelsIntensity < 120)
      return "good";
    else
      if (imagePixelsIntensity >= 120)
        return "perfect"


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
        bodyPartMap[marker]["x"] = 0;
        bodyPartMap[marker]["y"] = 0;

        for (var i = 0; i < prediction_history.length; i++) {
          bodyPartMap[marker]["x"] += prediction_history[i][marker].x;
          bodyPartMap[marker]["y"] += prediction_history[i][marker].y;
        }

        bodyPartMap[marker]["x"] /= prediction_history.length;
        bodyPartMap[marker]["y"] /= prediction_history.length;
      }

      bodyPartMapStore.set(bodyPartMap);
      const bodyStatus = calculateBodyStatus(bodyPartMap, input);
      bodyStatusStore.set(bodyStatus);
      inputCtx.drawImage(input, 0, 0, inputCanvas.width, inputCanvas.height);
      const lightningStatus = calculateLightningStatus(inputCtx, bodyPartMap, inputCanvas.width, inputCanvas.height);
      lightningStatusStore.set(lightningStatus);

      Object.keys(bodyPartMap).forEach(bodyPart => {
        drawPoint(ctx, bodyPartMap[bodyPart]["y"], bodyPartMap[bodyPart]["x"]);
      });

      drawLine(ctx,
        bodyPartMap['rightShoulder']["y"],
        bodyPartMap['rightShoulder']["x"],
        bodyPartMap['leftShoulder']["y"],
        bodyPartMap['leftShoulder']["x"],
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
