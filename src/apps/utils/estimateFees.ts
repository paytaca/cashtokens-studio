export default ({
  numInputs,
  numOutputs,
  inputType = 'p2pkh', // or 'multisig'
  m = 0,
  n = 0,
  satsPerByte = 1.5
}: { numInputs: number, numOutputs: number, inputType: 'p2pkh'|'p2sh'|'p2shMultisig', m: number, n: number, satsPerByte: number }) => {
  let inputSize;

  if (inputType === 'p2pkh') {
    // Standard P2PKH input size
    inputSize = 148;
  } else if (inputType === 'p2shMultisig') {
    // Estimate for 2-of-3 or similar P2SH multisig
    const redeemScriptSize = 49 + 34 * n;
    const sigsSize = 73 * m;
    const scriptSigSize = 1 + sigsSize + 1 + redeemScriptSize;
    inputSize = 32 + 4 + 1 + scriptSigSize + 4;
  } else {
    throw new Error("Invalid input type. Use 'p2pkh' or 'multisig'.");
  }

  const outputSize = 34; // Typical P2PKH output size
  const overhead = 10;   // Version (4) + locktime (4) + varint input/output counts (2)

  const totalSize = overhead + numInputs * inputSize + numOutputs * outputSize;
  const fee = totalSize * satsPerByte;

  return {
    estimatedSizeBytes: totalSize,
    estimatedFeeSatoshis: fee
  };
}