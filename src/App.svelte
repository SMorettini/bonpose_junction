<script>
  import { onMount } from "svelte";

  import { getVideoInputs, setupCamera, stopVideoCapture } from "./webcam";
  import { CustomPoseNet } from "./net";
  import { calculatePoseInRealTime } from "./pose";
  import { bodyStatusStore, lightningStatusStore } from "./store/pose";
  import Settings from "./components/Settings.svelte";
  import Section from "./components/layout/Section.svelte";
  import isFocused from "./store/isFocused";

  var seconds=0, minutes=0, hours=0;
  var secondsToPlot, minutesToPlot, hoursToPlot;
  var counter;
  var stop, start;
  var counting = false;

  window.onload = function () {
    counter = document.getElementById('counter')
    counting = true;
    timer();
  }

  function timer() {
    if (seconds >= 60) {
        minutes++;
        seconds = 0;
    }
    if (minutes >= 60) {
        hours++;
        minutes = 0;
    }
    hoursToPlot = (hours < 10) ? "0" + hours : hours;
    minutesToPlot = (minutes < 10) ? "0" + minutes : minutes;
    secondsToPlot = (seconds < 10) ? "0" + seconds : seconds;
    counter.innerHTML = hoursToPlot + "h" + minutesToPlot + "m" + secondsToPlot + "s";
    if (counting) {
        seconds++;
        setTimeout(timer, 1000);
    }
  }

  let error = "";
  let net;
  let camera;
  let videoStream;

  let videoEl;
  let outputEl;

  let bodyStatusString = "";
  let lightningStatusString = "";
  let monitorDistance = 0;
  let monitorPositionString = "";

  bodyStatusStore.subscribe((status) => {
    let resStr = "Your posture is great!";
    
    if (status.shouldersAngle === "bad" || status.eyesAngle === "bad") {
      resStr = `Hey! Your shoulder angle is ${status.shouldersAngle} and your head position is ${status.eyesAngle}!`;
    }

    monitorDistance = status.monitorDistance;
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

  table {
      font-family: arial, sans-serif;
      border-collapse: collapse;
      width: 80%;
      margin-left: auto;
      margin-right: auto;
    }

    td, th {
      border: 1px solid #f0f0f0;
      text-align: left;
      padding: 2px 8px;
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
    <div class="column">
    <Section title="Status">
      <p>{bodyStatusString}</p>
      <p></p>
      <p>{lightningStatusString}</p>
      <p></p>
      <p>{monitorPositionString}</p>
      <p></p>
      <p> Distance to the monitor: {window.parseInt(10 * monitorDistance) / 10} cm</p>
    </Section>

    <Section title="Settings">
      <Settings />
    </Section>
    </div>
    <Section title="Leaderboard">

    <table>
      <tr>
        <th>№</th>
        <th>Name</th>
        <th>Study time</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Artem Lukoianov</td>
        <td>13h42m11s</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Nikita Karamov</td>
        <td>13h30m20s</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Anna Valiullina</td>
        <td>10h44m32s</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Oganes Manasian</td>
        <td>10h22m30s</td>
      </tr>
      <tr>
        <td><b>5</b></td>
        <td><b>Guest</b></td>
        <td><b id="counter"></b></td>
      </tr>
    </table>
    </Section>
  </div>
</main>
