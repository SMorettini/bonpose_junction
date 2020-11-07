<script>
  import {
    checkInterval,
    intervalValues,
  } from "../store/settings/checkInterval";

  import Range from "./input/Range.svelte";
</script>

<style>
  .label-p {
    margin-bottom: 0.75rem;
  }
</style>

<article>
  <p class="label-p">
    <label for="checkInterval">
      When out of focus, check posture every
      <br />
      <b><nobr>{intervalValues[$checkInterval].name}</nobr></b>
    </label>
  </p>
  <p>
    <Range
      id="checkInterval"
      min="0"
      max={intervalValues.length - 1}
      step="1"
      bind:value={$checkInterval} />
  </p>
  <p>
    <small>When the window is focused, we check your posture multiple times a
      second to give you an idea of how it&nbsp;works</small>
  </p>
</article>
