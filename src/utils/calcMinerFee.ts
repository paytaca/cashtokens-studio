import getByteCount from "./getByteCount"

export default (inputs:any, outputs:any) => {
  const b = getByteCount(inputs, outputs)
  return Math.ceil(b * 1.1) + 400 // relayFee allowance
}
