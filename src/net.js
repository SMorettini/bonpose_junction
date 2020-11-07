import * as posenet from '@tensorflow-models/posenet';

import * as tf from '@tensorflow/tfjs-core';
const tf_version = tf.version_core;
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

// tf.setBackend('webgl');

/**
 * Pose
 *
 * @typedef {import('@tensorflow-models/posenet/dist/types').Pose} Pose
 */

/**
 * Posenet
 *
 * @typedef {import('@tensorflow-models/posenet/dist/types').PosenetInput} PosenetInput
 */

export class CustomPoseNet {
  constructor(flipHorizontal = true) {
    posenet.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: 240,
      multiplier: 0.5,
      quantBytes: 2,
    })
      .then(net => {
        this.network = net;
      });

    this.flipHorizontal = flipHorizontal;

    // keeping this makes sure it won't be deleted
    this.coreVersion = tf_version;
  }

  /**
   * Estimates the pose based on the image
   *
   * @param {PosenetInput} image input for the network
   * @return {Promise<Pose>} pose data
   */
  async estimatePose(image) {
    return this.network.estimateSinglePose(image, {
      flipHorizontal: this.flipHorizontal,
    });
  }
}
