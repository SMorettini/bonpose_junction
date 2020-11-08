import { writable } from 'svelte/store';

export const bodyPartMapStore = writable({});

export const bodyStatusStore = writable({
  shouldersAngle: null,
  eyesAngle: null,
  monitorDistance: null,
<<<<<<< Updated upstream
  monitorPosition: null, // Angle at which user is looking at the monitor
=======
  viewAngle: null,
>>>>>>> Stashed changes
});

export const lightningStatusStore = writable({});
