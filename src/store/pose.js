import { writable } from 'svelte/store';

export const bodyPartMapStore = writable({});

export const bodyStatusStore = writable({
  shouldersAngle: null,
  eyesAngle: null,
  monitorDistance: null,
  viewAngle: null,
});

export const lightningStatusStore = writable({});
