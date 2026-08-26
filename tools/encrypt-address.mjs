/* ==========================================================================
   OpenRAG website — contact address generator
   Vanilla Node, no dependencies. Run by hand when the address changes:

       node tools/encrypt-address.mjs <address>

   Prints the constants to paste into the CONTACT block of js/site.js.

   The address is encrypted with AES-GCM under a key derived by iterated
   PBKDF2. Nothing is withheld from the published constants: the barrier is
   the CPU time needed to redo the derivation, not secrecy. Harvesters that
   never execute JavaScript get nothing at all.

   Node's crypto.subtle is the same WebCrypto API the browser decrypts with,
   so the two sides cannot drift apart.
   ========================================================================== */

const subtle = globalThis.crypto.subtle;

/* Work factor. CHUNKS only sets progress granularity; CHUNKS * ITERS is the
   cost. Calibrate in a browser, not here: Chrome and Node disagree by enough
   that Node timings are useless as a proxy. Measured in Chrome, one million
   iterations costs ~130 ms on an idle desktop and ~475 ms when the page's own
   animations are competing for the main thread, since the derivation yields
   between chunks. Reckon on three to four times that on a mid-range phone. */
const CHUNKS = 20;
const ITERS = 50000;
const SEED = 'openrag-contact-v1';

async function deriveKeyBits(salt) {
  let bits = new TextEncoder().encode(SEED);
  for (let i = 0; i < CHUNKS; i++) {
    const material = await subtle.importKey('raw', bits, { name: 'PBKDF2' }, false, ['deriveBits']);
    bits = new Uint8Array(await subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: ITERS, hash: 'SHA-256' }, material, 256));
  }
  return bits;
}

const address = process.argv[2];
if (!address || address.indexOf('@') === -1) {
  console.error('usage: node tools/encrypt-address.mjs <address>');
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const started = performance.now();
const bits = await deriveKeyBits(salt);
const elapsed = performance.now() - started;

const key = await subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt']);
const cipher = new Uint8Array(await subtle.encrypt(
  { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(address)));

const b64 = (u8) => Buffer.from(u8).toString('base64');

console.log('  /* Contact address, AES-GCM encrypted. Regenerate with');
console.log('     tools/encrypt-address.mjs — see that file for the scheme. */');
console.log("  var POW_SALT = '" + b64(salt) + "';");
console.log("  var POW_IV = '" + b64(iv) + "';");
console.log("  var POW_CIPHER = '" + b64(cipher) + "';");
console.log('  var POW_CHUNKS = ' + CHUNKS + ';');
console.log('  var POW_ITERS = ' + ITERS + ';');
console.log('');
console.log('  // derivation took ' + elapsed.toFixed(0) + ' ms on this machine');
