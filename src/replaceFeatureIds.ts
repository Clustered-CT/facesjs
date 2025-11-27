import { display } from "./display.js";
import { FaceConfig, Feature, Overrides } from "./common.js";
import { deepCopy } from "./utils.js";

export type FeatureIdMap = Partial<Record<Feature, string>>;

/**
 * Return a copy of a face with specified feature IDs replaced.
 */
export const replaceFeatureIds = (
  face: FaceConfig,
  replacements: FeatureIdMap,
): FaceConfig => {
  const next = deepCopy(face);
  for (const [feature, newId] of Object.entries(replacements)) {
    if (!newId) continue;
    const key = feature as Feature;
    if ((next as any)[key] && typeof (next as any)[key] === "object") {
      (next as any)[key].id = newId;
    }
  }
  return next;
};

/**
 * Convenience wrapper: apply feature ID replacements, then render.
 */
export const displayWithFeatureIds = (
  container: HTMLElement | string | null,
  face: FaceConfig,
  replacements: FeatureIdMap,
  overrides?: Overrides,
): void => {
  const updated = replaceFeatureIds(face, replacements);
  display(container, updated, overrides);
};
