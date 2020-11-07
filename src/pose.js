import { bodyPartMapStore, bodyStatusStore } from './store/pose';
import { drawLine, drawPoint } from './draw';
import checkInterval from './store/settings/checkInterval';
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
 * @param {{(key: string): Vector2D}} bodyPartMap body part to location vector map
 */
function calculateBodyStatus(bodyPartMap) {
  const result = {
    shouldersAngle: null,
    eyesAngle: null,
  };

  result.shouldersAngle = checkDiffBetweenPoints(bodyPartMap.leftShoulder, bodyPartMap.rightShoulder, 50);
  result.eyesAngle = checkDiffBetweenPoints(bodyPartMap.leftEye, bodyPartMap.rightEye, 120, 'x');

  return result
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
    checkIntervalInMs = val * 60 * 1000; // min to ms
  })

  let focused = true;
  isFocused.subscribe(val => {
    focused = val;
  })

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

      console.log(prediction_history);
      console.log(bodyPartMap);

      bodyPartMapStore.set(bodyPartMap);
      const bodyStatus = calculateBodyStatus(bodyPartMap);
      bodyStatusStore.set(bodyStatus);

      Object.keys(bodyPartMap).forEach(bodyPart => {
        drawPoint(ctx, bodyPartMap[bodyPart]["y"], bodyPartMap[bodyPart]["x"]);
      });

      drawLine(ctx,
        bodyPartMap['rightShoulder']["y"],
        bodyPartMap['rightShoulder']["x"],
        bodyPartMap['leftShoulder']["y"],
        bodyPartMap['leftShoulder']["x"],
      );

    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);
}
