/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clock from "../clock.js";
import type * as crew from "../crew.js";
import type * as jobs from "../jobs.js";
import type * as lib from "../lib.js";
import type * as parts from "../parts.js";
import type * as phases from "../phases.js";
import type * as pledges from "../pledges.js";
import type * as posts from "../posts.js";
import type * as receipts from "../receipts.js";
import type * as scan from "../scan.js";
import type * as seed from "../seed.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clock: typeof clock;
  crew: typeof crew;
  jobs: typeof jobs;
  lib: typeof lib;
  parts: typeof parts;
  phases: typeof phases;
  pledges: typeof pledges;
  posts: typeof posts;
  receipts: typeof receipts;
  scan: typeof scan;
  seed: typeof seed;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
