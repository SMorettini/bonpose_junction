import App from './App.svelte';

// fallback for older browsers
navigator.getUserMedia = navigator.getUserMedia
  || navigator.webkitGetUserMedia
  || navigator.mozGetUserMedia;

const app = new App({
  target: document.body,
  props: {},
});

export default app;
