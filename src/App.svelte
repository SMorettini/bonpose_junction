<script>
  import { onMount } from "svelte";

  import { getVideoInputs, setupCamera, stopVideoCapture } from "./webcam";
  import { CustomPoseNet } from "./net";
  import { calculatePoseInRealTime } from "./pose";
  import { bodyStatusStore, lightningStatusStore } from "./store/pose";
  import Settings from "./components/Settings.svelte";
  import Section from "./components/layout/Section.svelte";
  import isFocused from "./store/isFocused";

  let error = "";
  let net;
  let camera;
  let videoStream;

  let videoEl;
  let outputEl;

  let bodyStatusString = "";
  let lightningStatusString = "";
  let monitorDistance = 0;
<<<<<<< Updated upstream
  let monitorPositionString = "";
=======
  let viewAngle = 0;
>>>>>>> Stashed changes

  bodyStatusStore.subscribe((status) => {
    let resStr = "Your posture is great!";
    
    if (status.shouldersAngle === "bad" || status.eyesAngle === "bad") {
      resStr = `Hey! Your shoulder angle is ${status.shouldersAngle} and your head position is ${status.eyesAngle}!`;
    }

    monitorDistance = status.monitorDistance;
    viewAngle = status.viewAngle;
    bodyStatusString = resStr;

    monitorPositionString = "Your screen is positioned correctly!"
    if (status.monitorPosition > 0.2) {
      // Threshold is distance from center of eyes to center of screen at Y coordinate divided by screen height
      monitorPositionString = `Please consider lowering the screen to fix the viewing angle!`;
    } else if (status.monitorPosition < -0.2) {
      // Threshold is distance from center of eyes to center of screen at Y coordinate divided by screen height
      monitorPositionString = `Please consider lifting the screen to fix the viewing angle!`;
    }
  });

  lightningStatusStore.subscribe(status => {
    let resStr = "Your lightning is great!";

    if (status === 'bad') {
      resStr = `Hey! Fix the lightning, your eyes are going to die soon!`
    }
    if (status === 'good') {
      resStr = `Your lighting is OK, however some extra light will not hurt!`
    }

    lightningStatusString = resStr;
  })

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

<svelte:window
  on:blur={() => isFocused.set(false)}
  on:focus={() => isFocused.set(true)} />

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
      <p>{lightningStatusString}</p>
      <p></p>
      <p>{monitorPositionString}</p>
      <p></p>
      <p> Distance to the monitor: {window.parseInt(monitorDistance)} cm</p>
      <p> View angle: {window.parseInt(viewAngle)} degrees</p>
    </Section>
    <Section title="Settings">
      <Settings />
    </Section>
  </div>
</main>
