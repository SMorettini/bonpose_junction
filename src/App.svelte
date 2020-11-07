<script>
  import { onMount } from 'svelte';

  import { getVideoInputs, setupCamera, stopVideoCapture } from './webcam';
  import { CustomPoseNet } from './net';
  import { calculatePoseInRealTime } from './pose';
  import { bodyStatusStore } from './store/pose';

  let error = '';
  let net;
  let camera;
  let videoStream;

  let videoEl;
  let outputEl;

  let bodyStatusString = "";

  bodyStatusStore.subscribe(status => {
    let resStr = "Your posture is great!";

    if (status.shouldersAngle === 'bad' || status.eyesAngle === 'bad') {
      resStr = `Hey! Your shoulder angle is ${status.shouldersAngle} and your head position is ${status.eyesAngle}!`
    }

    bodyStatusString = resStr;
  })

  async function loadVideo(label) {
    error = '';

    try {
      stopVideoCapture(videoStream);
      videoStream = await setupCamera(videoEl, label);
    } catch (e) {
      error = 'This browser does not support video capture, or this device does not have a camera';
      throw e;
    }

    await videoStream.play();
  }

  onMount(async () => {
    net = await new CustomPoseNet();

    const cameras = await getVideoInputs();
    if (cameras.length > 0) {
      camera = cameras[0];
    }

    await loadVideo(camera.label);

    calculatePoseInRealTime(net, videoEl, outputEl);
  });
</script>

<main>
  <h1>BonPose</h1>
  <video playsinline bind:this={videoEl}></video>
  <canvas bind:this={outputEl}></canvas>
  <p class="error">{error || ''}</p>
  <p>{bodyStatusString}</p>
</main>

<style>
  main {
    text-align: center;
    padding: 1rem;
    height: 100%;
    width: 100%;
  }

  h1 {
    color: #000;
    font-size: 4rem;
    font-weight: 900;
    margin: 2rem 0 1rem;
  }

  video {
    display: none;
  }

  .error {
    color: orangered;
  }
</style>
