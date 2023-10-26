// Note: "Tokeshi" is just a made up name for basic unit of Tokens, because I don't know what its called.

type Tokeshi = string

/**
 * Converts a decimal value to Token (satoshi) "Tokeshi" amount based on Token's
 * decimal metadata.
 
 * @param {number} floatOrIntAmount The amount to convert to tokeshi 
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const numberToTokeshi  = (floatOrIntAmount: number, decimal?:string): Tokeshi => {
    if (decimal === undefined || decimal === '0') {
        return String(Math.floor(floatOrIntAmount * 1e0))    
    }
    
    if (Number(decimal) < 0) {
        throw new Error('Invalid value passed to decimal parameter')
    }

    return String(Math.floor(floatOrIntAmount * eval(`1e${decimal}`)))
}

/**
 * Converts a tokeshiAmount to decimal
 * @param {number} tokeshiAmount The amount to convert to tokeshi 
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const tokeshiToNumber  = (tokeshiAmount: number, decimal?: string): number => {
    if (decimal === undefined || decimal === '0') {
        return tokeshiAmount / 1e0    
    }
    
    if (Number(decimal) < 0) {
        throw new Error('Invalid value passed to decimal parameter')
    }

    return tokeshiAmount / eval(`1e${decimal}`)
}