import { bodyPartMapStore, bodyStatusStore, lightningStatusStore } from './store/pose';
import { drawLine, drawPoint } from './draw';

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
  };

  result.shouldersAngle = checkDiffBetweenPoints(bodyPartMap.leftShoulder, bodyPartMap.rightShoulder, 50);
  result.eyesAngle = checkDiffBetweenPoints(bodyPartMap.leftEye, bodyPartMap.rightEye, 120, 'x');
  result.monitorDistance = computeMonitorDistance(bodyPartMap.leftEye, bodyPartMap.rightEye, input.width);

  return result
}


function calculateLightningStatus(canvas, bodyPartMap) {
  let leftEarPos = bodyPartMap["leftEar"];
  let rightEarPos = bodyPartMap["rightEar"];
  if (leftEarPos === -1 || rightEarPos === -1) {
    return true
  }

  const canvasCtx = canvas.getContext("2d");
  const faceHeight = Math.abs(leftEarPos.y - rightEarPos.y);

  // calculate mean face intensity
  let facePixels = 0;
  let facePixelsIntensityCum = 0;
  for (let i = leftEarPos.x; i <= rightEarPos.x; i++) {
    for (let j = leftEarPos.y - faceHeight * 2.0 / 3.0; j < leftEarPos.y + faceHeight / 3.0; j++) {
      const pixel = canvasCtx.getImageData(i, j, 1, 1);
      const intensity = (pixel.data[0] + pixel.data[1] + pixel.data[2]) / 3;

      facePixelsIntensityCum += intensity;
      facePixels++;
    }
  }
  let facePixelsIntensity = facePixelsIntensityCum / facePixels;

  // // calculate mean background intensity
  // let backgroundPixels = 0;
  // let backgroundPixelsIntensityCum = 0;
  // for (let i = 0; i <= canvas.width; i+=10) {
  //   for (let j = 0; j < canvas.height; j+=10) {
  //     const pixel = canvasCtx.getImageData(i, j, 1, 1);
  //     const intensity = (pixel.data[0] + pixel.data[1] + pixel.data[2]) / 3;
  //
  //     backgroundPixelsIntensityCum += intensity;
  //     backgroundPixels++;
  //   }
  // }
  // backgroundPixelsIntensityCum -= facePixelsIntensityCum; // Background is everything on image except of face
  // let backgroundPixelsIntensity = backgroundPixelsIntensityCum / backgroundPixels;

  return facePixelsIntensity.toString()
  // return facePixelsIntensity <= 1.05 * backgroundPixelsIntensity ? 'good' : 'bad'
  // return facePixelsIntensity > 256 ? 'good' : 'bad'

}
/**
 * @param {CustomPoseNet} net
 * @param {HTMLVideoElement|HTMLCanvasElement} input
 * @param {HTMLCanvasElement} output
 */
export function calculatePoseInRealTime(net,
                                        input,
                                        output) {

  const inputCanvas = document.createElement('canvas');
  inputCanvas.height = input.videoHeight;
  inputCanvas.width = input.videoWidth;
  const inputCtx = inputCanvas.getContext('2d');
  inputCtx.drawImage(input, 0, 0, inputCanvas.width, inputCanvas.height);

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

  async function drawFrame() {
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
      const lightningStatus = calculateLightningStatus(inputCanvas, bodyPartMap);
      // const lightningStatus = "good";
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

  drawFrame();
}
