
/**
 * Converts an raw token amount to decimal form given the decimal metadata
 * @param {string} rawFt The raw fungible token amount
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const toDecimal = (rawFt: string, decimal?:number):string => {
    try {
        if (decimal === undefined || decimal == 0) {
            return rawFt    
        }
        if (Number(decimal) < 0) {
            throw new Error('Invalid decimal value')
        }
        const bigIntInput = BigInt(rawFt);

        const integerPart = (bigIntInput / BigInt(10 ** decimal)).toString();
        const remainderPart = (bigIntInput % BigInt(10 ** decimal)).toString();

        // Pad the remainder part with zeros if needed
        const paddedRemainder = remainderPart.padStart(decimal, '0');
        let formattedDecimal = `${integerPart}.${paddedRemainder}`;
        console.log('F', formattedDecimal)
        if (formattedDecimal.includes('-')) {
            formattedDecimal = formattedDecimal.replace(/-/g,'')
            formattedDecimal = `-${formattedDecimal}`
        }
        return formattedDecimal;
    } catch (error) {
        throw new Error('Invalid input: not a valid number')
    }
}

/**
 * Converts a value to raw considering the decimal parameter.
 * 
 * @param {string} decimalFt The fungible amount
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const toRaw = (decimalFt:string, decimal?:number):string => {
    try {

        // if (decimal === undefined || decimal == 0) {
        //     return decimalFt    
        // }

        if (!decimal) {
            decimal = 0
        }

        const [integerPart, decimalPart] = decimalFt.split('.');
        
        const integerBigInt = BigInt(integerPart);
        let decimalBigInt 
        if (!decimalPart) {
            decimalBigInt = BigInt(''.padEnd(decimal, '0'));
        } else {
            decimalBigInt = BigInt(decimalPart.padEnd(decimal, '0'));
        }
        
        if (decimalPart && decimalPart.length > decimal) {
            decimalBigInt = BigInt(decimalPart.slice(0, decimal))
        }
        const originalBigInt = integerBigInt * BigInt(10 ** decimal) + decimalBigInt;

        return originalBigInt.toString();
    } catch (error) {
        return '0'
    }

}

export default {
    toRaw,
    toDecimal
}
