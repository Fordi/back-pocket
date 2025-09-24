export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

const ENCODER = new TextEncoder();
type AnyBuffer = string | ArrayBuffer | TypedArray | ArrayLike<number>;

const toUint8Array = (buffer: AnyBuffer) =>
  typeof buffer === "string"
    ? ENCODER.encode(buffer)
    : (new Uint8Array(
        "buffer" in buffer ? (buffer.buffer as ArrayBuffer) : buffer
      ) as any);

type ToUrl64 = (buffer: AnyBuffer) => string;

export let _nativeToUrl64: ToUrl64;

export const nativeToUrl64 = () =>
  (_nativeToUrl64 ??= (buffer) =>
    toUint8Array(buffer).toBase64({
      alphabet: "base64url",
      omitPadding: true,
    }) as string);

export let _polyfilledToUrl64: ToUrl64;
export const polyfilledToUrl64 = () => {
  const ALPHABET_B64U = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  ].map((c) => c.charCodeAt(0));
  const NO_DETATCHED =
    "Tried to convert array with detached buffer to base64url";
  // return (arr) => btoa(String.fromCharCode(...arr)).replace(/=+$/, '');
  return (_polyfilledToUrl64 ??= (buffer) => {
    if (
      typeof buffer !== "string" &&
      (("detached" in buffer && buffer.detached) ||
        ("buffer" in buffer &&
          "detached" in buffer.buffer &&
          buffer.buffer.detached))
    ) {
      throw new TypeError(NO_DETATCHED);
    }
    const arr = toUint8Array(buffer);
    const len = arr.byteLength;
    const result = new Uint8Array(Math.ceil((len * 4) / 3));
    const over = len % 3;
    const finalQuad = over ? over + 1 : 0;
    const finalShift = 6 * (3 - over);
    for (let ii = 0, oi = 0; ii < len; ii += 3, oi += 4) {
      let triplet =
        (arr[ii] << 16) + ((arr[ii + 1] ?? 0) << 8) + (arr[ii + 2] ?? 0);
      let quadSize = 4;
      if (finalQuad && ii + 3 > arr.length) {
        quadSize = finalQuad;
        triplet >>= finalShift;
      }
      for (let qi = quadSize - 1; qi >= 0; qi--) {
        result[oi + qi] = ALPHABET_B64U[triplet & 0x3f];
        triplet >>= 6;
      }
    }
    return String.fromCharCode(...result);
  });
};

export const toUrl64: ToUrl64 = (buffer) =>
  ("toBase64" in Uint8Array.prototype ? nativeToUrl64() : polyfilledToUrl64())(
    buffer
  );
