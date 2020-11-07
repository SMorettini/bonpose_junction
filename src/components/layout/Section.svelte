<script>
  export let title = "";
</script>

<style>
  h2 {
    margin-bottom: 2rem;
    font-size: 2rem;
    font-weight: 900;
  }
</style>

<section>
  <h2>{title}</h2>
  <slot />
</section>
