import { FaceConfig, Feature, Overrides } from "./common.js";
export type FeatureIdMap = Partial<Record<Feature, string>>;
/**
 * Return a copy of a face with specified feature IDs replaced.
 */
export declare const replaceFeatureIds: (face: FaceConfig, replacements: FeatureIdMap) => FaceConfig;
/**
 * Convenience wrapper: apply feature ID replacements, then render.
 */
export declare const displayWithFeatureIds: (container: HTMLElement | string | null, face: FaceConfig, replacements: FeatureIdMap, overrides?: Overrides) => void;
