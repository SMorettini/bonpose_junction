import { createSettingsStore } from ".";

const checkInterval = createSettingsStore(
  "checkInterval",
  15,
  (x) => parseInt(x, 10),
  (x) => x.toString()
);

export default checkInterval;