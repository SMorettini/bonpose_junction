import { writable } from 'svelte/store';

export function createSettingsStore(
  key,
  defaultValue,
  readTransform = x => x,
  writeTransform = x => x
) {
  const savedValue = readTransform(localStorage.getItem(key)) || defaultValue;

  const store = writable(savedValue);
  store.subscribe(newValue => {
    localStorage.setItem(key, writeTransform(newValue))
  });

  return store;
}