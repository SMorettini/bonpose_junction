<script>
  import checkInterval from "../store/settings/checkInterval";

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
      Check posture every
      <b>{$checkInterval}</b>
      minutes
    </label>
  </p>
  <p>
    <Range
      id="checkInterval"
      min="5"
      max="30"
      step="5"
      bind:value={$checkInterval} />
  </p>
</article>
