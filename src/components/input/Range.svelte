<script>
  export let min = 0;
  export let max = 100;
  export let step = 1;

  export let value;
</script>

<input type="range" bind:value {min} {max} {step} {...$$restProps}>
