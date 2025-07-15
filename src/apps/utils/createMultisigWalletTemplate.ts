import { WalletTemplateEntity, WalletTemplateScript } from "bitauth-libauth-v3"

type MultisigSpec = { m: number, n: number }
type SignatureAlgo = 'ecdsa' | 'schnorr'
type SignerEntityKey = `signer_${number}`

/**
 * Util function for grouping every possible cosigner combinations.
 *
 * // Example usage:
 * const m = 2 // Cosigners to select
 * const n = 3 // Total cosigners
 * const combinations = groupCosigners({m, n})
 * // Output:
 * [
 *  [1, 2],
 *  [1, 3],
 *  [2, 3]
 * ]
 */
export const groupCosigners = ({ m, n }: MultisigSpec) /*: str[][] */ => {
  const result: number[][] = []

  const combine = (start: number, currentCombination: number[]) => {
    // If the current combination has m elements, add it to the result
    if (currentCombination.length === m) {
      result.push([...currentCombination])
      return
    }

    // Iterate over the remaining elements to form combinations
    for (let i = start; i <= n; i++) {
      currentCombination.push(i)
      combine(i + 1, currentCombination)
      currentCombination.pop()
    }
  }

  combine(1, [])
  return result
}

/**
 * Generate checkbits required for schnorr signatures.
 * @returns { string } Example: <0b1010>
 */
export const generateSchnorrCheckbits = (cosignerGroups: number[]): string => {
  let checkbit = 0
  for (const cosignerPosition of cosignerGroups) {
    checkbit = checkbit | (1 << cosignerPosition - 1)
  }
  return `<0b${checkbit.toString(2).padStart(3, '0')}>`
}

export const generateUnlockingScriptDummy = ({
  cosignerGroup /* : int[] // example: [2, 4] */,
  signatureAlgo /* ?: ecdsa | schnorr */
}: { cosignerGroup: number[], signatureAlgo: 'ecdsa'|'schnorr' }) => {
  const dummy = 'OP_0' // ecdsa
  if (signatureAlgo === 'schnorr') {
    return generateSchnorrCheckbits(cosignerGroup)
  }

  return dummy
}

export const generateLockScript = ({ m, n }: MultisigSpec) => {
  let script = `OP_${m}\n<pubkeys>OP_${n}\nOP_CHECKMULTISIG`
  let pubkeys = ''
  for (let i = 1; i < n + 1; i++) {
    pubkeys += `<key${i}.public_key>\n`
  }
  script = script.replace('<pubkeys>', pubkeys)
  return {
    lockingType: 'p2sh20',
    name: `${m} of ${n} Vault`,
    script
  }
}

export const generateScripts = ({ m, n, signatureAlgo }: MultisigSpec & { signatureAlgo: SignatureAlgo } ) => {
  
  const cosignerGroups = groupCosigners({ m, n })
  const scripts: Record<string, any> = {}

  for (const cosignerGroup of cosignerGroups) {
    const key = cosignerGroup.join('_and_')
    const name = `Cosigner ${cosignerGroup.join(' & ')}`
    const dummy = generateUnlockingScriptDummy({ cosignerGroup, signatureAlgo })
    let script = dummy
    for (const cosignerPosition of cosignerGroup) {
      script += `\n<key${cosignerPosition}.${signatureAlgo}_signature.all_outputs>`
    }
    scripts[key] = {
      name,
      script,
      unlocks: 'lock'
    }
  }
  scripts.lock = generateLockScript({ m, n })
  return scripts
}

export const generateEntity = ({
  signerIndex /*: number // signer position */,
  scripts /* :Object // from generateScripts() */,
  signerNames
}: { signerIndex: number, scripts: Record<string, any>, signerNames?: Record<SignerEntityKey, string> }): [SignerEntityKey, WalletTemplateEntity] => {

  let signerScriptNames = Object.entries(scripts)
    .filter(([scriptName] /* ,scriptValue */) => {
      return scriptName.includes(String(signerIndex))
    })
    .map(([scriptName]) => {
      return scriptName
    })

  // include 'lock'
  const entityKey: SignerEntityKey = `signer_${signerIndex}`
  let name = `Signer ${signerIndex}`
  if (signerNames && signerNames[entityKey]) {
    name = signerNames[entityKey]
  }

  signerScriptNames = ['lock', ...signerScriptNames]
  
  const entityValue: WalletTemplateEntity = {
    description: '',
    name,
    scripts: signerScriptNames,
    variables: {
      [`key${signerIndex}`]: {
        description: '',
        name: `key${signerIndex}`,
        type: 'HdKey'
      }
    }
  }
  return [entityKey, entityValue]
}

export const generateEntities = ({
    n, scripts /* from generateScripts */, signerNames 
}: { n: number, scripts: Record<string, WalletTemplateScript>, signerNames?: Record<SignerEntityKey, string> }) => {
  const entities: Record<SignerEntityKey, WalletTemplateEntity> = {}
  for (let i = 0; i < n; i++) {
    const [entityKey, entityValue] = generateEntity({ signerIndex: i + 1, scripts, signerNames })
    entities[entityKey] = entityValue
  }
  return entities
}

/**
 * options?.$schema = 'https://libauth.org/schemas/wallet-template-v0.schema.json'
 * options?.name = 'm of n Multisig'
 * options.m
 * options.n
 */
export const createTemplate = ({
  name,
  m, n,
  signatureAlgo,
  signerNames
}: MultisigSpec & { name?: string, signatureAlgo: SignatureAlgo, signerNames?: Record<SignerEntityKey, string> }) => {
  const template = {
    name: '',
    $schema: 'https://libauth.org/schemas/wallet-template-v0.schema.json',
    entities: { /* generate */ },
    scripts: { /* generate */ },
    supported: ['BCH_2021_05', 'BCH_2022_05', 'BCH_2023_05'],
    version: 0
  }
  template.name = name || `${m}-of-${n} Multisig`
  template.scripts = generateScripts({ m, n, signatureAlgo: signatureAlgo || 'schnorr' })
  template.entities = generateEntities({ n, scripts: template.scripts, signerNames })
  return template
}
