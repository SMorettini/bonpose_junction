<script>
  import { onMount } from "svelte";

  import { getVideoInputs, setupCamera, stopVideoCapture } from "./webcam";
  import { CustomPoseNet } from "./net";
  import { calculatePoseInRealTime } from "./pose";
  import { bodyStatusStore } from "./store/pose";
  import Settings from "./components/Settings.svelte";
  import Section from "./components/layout/Section.svelte";

  let error = "";
  let net;
  let camera;
  let videoStream;

  let videoEl;
  let outputEl;

  let bodyStatusString = "";
  let monitorDistance = 0;

  bodyStatusStore.subscribe((status) => {
    let resStr = "Your posture is great!";
    
    if (status.shouldersAngle === "bad" || status.eyesAngle === "bad") {
      resStr = `Hey! Your shoulder angle is ${status.shouldersAngle} and your head position is ${status.eyesAngle}!`;
    }

    monitorDistance = status.monitorDistance;
    bodyStatusString = resStr;
  });

  async function loadVideo(label) {
    error = "";

    try {
      stopVideoCapture(videoStream);
      videoStream = await setupCamera(videoEl, label);
    } catch (e) {
      error =
        "This browser does not support video capture, or this device does not have a camera";
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

<style>
  main {
    text-align: center;
    padding: 1rem;
    height: 100%;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    align-items: start;
  }

  .row > :global(*) {
    flex-grow: 1;
    flex-basis: 50%;
    padding: 1rem;
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

  canvas {
    max-width: 100%;
  }

  .error {
    color: orangered;
  }
</style>

<main>
  <h1>BonPose</h1>
  <div class="row">
    <Section title="Video">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video playsinline bind:this={videoEl} />
      <canvas bind:this={outputEl} />
      <p class="error">{error || ''}</p>
    </Section>
    <Section title="Status">
      <p>{bodyStatusString}</p>
      <p></p>
      <p> Distance to the monitor: {window.parseInt(10 * monitorDistance) / 10} cm</p>
    </Section>
    <Section title="Settings">
      <Settings />
    </Section>
  </div>
</main>
