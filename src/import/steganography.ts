// Minimal steganography decoder ported from
// https://github.com/peterneubauer/steganography.js (MIT)
// Only the threshold=1, t=3, codeUnitSize=16 case used by HappyIslandDesigner
// is implemented — that's the configuration HID uses by default.
//
// The algorithm encodes a UTF-16 message into the alpha channel of an RGBA
// image by shifting each byte into the range `[255-prime+1 .. 255]`, where
// `prime = nextPrimeAfter(2^t)`. For t=3 the prime is 11.
// A delimiter of 16 consecutive alpha=255 values marks end-of-message.

const T = 3;
const PRIME = 11; // next prime after 2^3 = 8
const CODE_UNIT_SIZE = 16;
const BASE = 255 - PRIME + 1; // 245

/**
 * Decode a message hidden in the alpha channel of an RGBA pixel buffer.
 * Returns `null` if no end-of-message delimiter is found (image likely has no
 * embedded payload).
 */
export function decodeAlphaSteganography(data: Uint8ClampedArray | number[]): string | null {
  const mod: number[] = [];

  // Walk alpha bytes (i=3, i+=4). Stop at the first delimiter (16 consecutive
  // alpha=255 bytes), which HID writes after every payload.
  let i = 3;
  let foundDelimiter = false;
  while (i < data.length) {
    // delimiter check
    let isDelimiter = true;
    for (let k = 0; k < 16; k++) {
      if (data[i + k * 4] !== 255) {
        isDelimiter = false;
        break;
      }
    }
    if (isDelimiter) {
      foundDelimiter = true;
      break;
    }
    mod.push(data[i] - BASE);
    i += 4;
  }

  if (!foundDelimiter) return null;

  // Reassemble UTF-16 code units from 3-bit chunks.
  let message = '';
  let charCode = 0;
  let bitCount = 0;
  const mask = Math.pow(2, CODE_UNIT_SIZE) - 1;
  for (let j = 0; j < mod.length; j++) {
    const v = mod[j];
    if (v < 0 || v >= PRIME) {
      // Bytes outside the expected range mean either the image was lossily
      // re-encoded (JPEG / WebP) or it never carried a HID payload.
      return null;
    }
    charCode += v << bitCount;
    bitCount += T;
    if (bitCount >= CODE_UNIT_SIZE) {
      message += String.fromCharCode(charCode & mask);
      bitCount %= CODE_UNIT_SIZE;
      charCode = v >> (T - bitCount);
    }
  }
  if (charCode !== 0) {
    message += String.fromCharCode(charCode & mask);
  }

  // HID always pads the message with a trailing 0xFFFF; strip nulls and FFFFs.
  return message.replace(/\u0000+$/, '').replace(/\uFFFF+$/, '');
}
