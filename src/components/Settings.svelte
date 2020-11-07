<script>
  import { createSettingsStore } from "../store/settings";

  const checkInterval = createSettingsStore(
    "checkInterval",
    15,
    (x) => parseInt(x, 10),
    (x) => x.toString()
  );

  import Range from "./input/Range.svelte";
</script>

<style>
  .label-p {
    margin-bottom: .75rem;
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
