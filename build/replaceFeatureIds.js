import { display } from "./display.js";
import { deepCopy } from "./utils.js";
/**
 * Return a copy of a face with specified feature IDs replaced.
 */
export const replaceFeatureIds = (face, replacements) => {
  const next = deepCopy(face);
  for (const [feature, newId] of Object.entries(replacements)) {
    if (!newId) continue;
    const key = feature;
    if (next[key] && typeof next[key] === "object") {
      next[key].id = newId;
    }
  }
  return next;
};

/**
 * Convenience wrapper: apply feature ID replacements, then render.
 */
export const displayWithFeatureIds = (container, face, replacements, overrides) => {
  const updated = replaceFeatureIds(face, replacements);
  display(container, updated, overrides);
};