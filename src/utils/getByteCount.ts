// bch-js
export default (inputs:any, outputs:any) => {
  let totalWeight = 0
  let hasWitness = false
  // assumes compressed pubkeys in all cases.
  const types = {
    inputs: {
      'MULTISIG-P2SH': 49 * 4,
      'MULTISIG-P2WSH': 6 + 41 * 4,
      'MULTISIG-P2SH-P2WSH': 6 + 76 * 4,
      P2PKH: 148 * 4,
      P2WPKH: 108 + 41 * 4,
      'P2SH-P2WPKH': 108 + 64 * 4
    } as any,
    outputs: {
      P2SH: 32 * 4,
      P2PKH: 34 * 4,
      P2WPKH: 31 * 4,
      P2WSH: 43 * 4
    } as any
  }

  Object.keys(inputs).forEach(function (key) {
    if (key.slice(0, 8) === 'MULTISIG') {
      // ex. "MULTISIG-P2SH:2-3" would mean 2 of 3 P2SH MULTISIG
      const keyParts = key.split(':')
      if (keyParts.length !== 2) throw new Error(`invalid input: ${key}`)
      const newKey = keyParts[0]
      const mAndN = keyParts[1].split('-').map(function (item) {
        return parseInt(item)
      })

      totalWeight += types.inputs[newKey] * inputs[key]
      const multiplyer = newKey === 'MULTISIG-P2SH' ? 4 : 1
      totalWeight += (73 * mAndN[0] + 34 * mAndN[1]) * multiplyer
    } else {
      totalWeight += types.inputs[key] * inputs[key]
    }
    if (key.indexOf('W') >= 0) hasWitness = true
  })

  Object.keys(outputs).forEach(function (key) {
    totalWeight += types.outputs[key] * outputs[key]
  })

  if (hasWitness) totalWeight += 2

  totalWeight += 10 * 4

  return Math.ceil(totalWeight / 4)
}