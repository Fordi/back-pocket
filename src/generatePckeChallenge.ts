import { toUrl64 } from "./toUrl64.ts";

const { subtle } = globalThis.crypto;

const ENCODER = new TextEncoder();

export const generatePkceChallenge = async (verifier: string) =>
  toUrl64(await subtle.digest("SHA-256", ENCODER.encode(verifier)));
