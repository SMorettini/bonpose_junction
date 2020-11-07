import { createSettingsStore } from ".";

const intervalValues = [
  {
    name: "second",
    time: 1000
  },
  {
    name: "30 seconds",
    time: 30*1000
  },
  {
    name: "minute",
    time: 60*1000
  },
  {
    name: "5 minutes",
    time: 5*60*1000
  },
  {
    name: "15 minutes",
    time: 15*60*1000
  }
]

const checkInterval = createSettingsStore(
  "checkInterval",
  Math.floor(intervalValues.length / 2),
  (x) => parseInt(x, 10),
  (x) => x.toString()
);

export {checkInterval, intervalValues};