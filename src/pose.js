import { bodyPartMapStore, bodyStatusStore } from './store/pose';
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

  const ctx = output.getContext('2d');
  const flip = net.flipHorizontal;

  output.width = input.width;
  output.height = input.height;

  async function drawFrame() {
    const pose = await net.estimatePose(input);

    ctx.clearRect(0, 0, input.width, input.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-input.width, 0);
    ctx.drawImage(input, 0, 0, input.width, input.height);
    ctx.restore();

    if (pose.score >= 0.15) {
      const bodyPartMap = extractBodyPartPositions(pose, [
        'leftEar',
        'rightEar',
        'leftEye',
        'rightEye',
        'leftShoulder',
        'rightShoulder',
      ]);
      bodyPartMapStore.set(bodyPartMap);
      const bodyStatus = calculateBodyStatus(bodyPartMap);
      bodyStatusStore.set(bodyStatus);

      Object.keys(bodyPartMap).forEach(bodyPart => {
        drawPoint(ctx, bodyPartMap[bodyPart].y, bodyPartMap[bodyPart].x);
      });

      drawLine(ctx,
        bodyPartMap['rightShoulder'].y,
        bodyPartMap['rightShoulder'].x,
        bodyPartMap['leftShoulder'].y,
        bodyPartMap['leftShoulder'].x,
      );
    }

    requestAnimationFrame(drawFrame);
  }

  drawFrame();
}
