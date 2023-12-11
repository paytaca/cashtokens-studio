// Note: "Tokeshi" is just a made up name for basic unit of Tokens, because I don't know what its called.

type Tokeshi = string

/**
 * Converts a decimal value to Token (satoshi) "Tokeshi" amount based on Token's
 * decimal metadata.
 
 * @param {string} rawFt The raw fungible token amount
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const toDecimal = (rawFt: string, decimal?:number):string => {
    try {
        // Convert the input string to a BigInt
        if (decimal === undefined || decimal === 0) {
            return rawFt    
        }
        if (Number(decimal) < 0) {
            throw new Error('Invalid decimal value')
        }
        const bigIntInput = BigInt(rawFt);

        // Divide the BigInt to get the integer and remainder parts
        const integerPart = (bigIntInput / BigInt(10 ** decimal)).toString();
        const remainderPart = (bigIntInput % BigInt(10 ** decimal)).toString();

        // Pad the remainder part with zeros if needed
        const paddedRemainder = remainderPart.padStart(decimal, '0');

        // Concatenate the integer and padded remainder parts
        const formattedDecimal = `${integerPart}.${paddedRemainder}`;

        return formattedDecimal;
    } catch (error) {
        throw new Error('Invalid input: not a valid number')
    }
}

/**
 * Converts a tokeshiAmount to decimal
 * @param {string} decimalFt The fungible amount in decimal form
 * @param {string} decimal Token's decimal value as defined in the Token's metadata registry. Default = none
 */
export const toRaw = (decimalFt:string, decimal?:number):string => {
    try {
        
        if (decimal === undefined || decimal === 0) {
            return decimalFt    
        }
        // Split the formatted decimal into integer and decimal parts
        const [integerPart, decimalPart] = decimalFt.split('.');

        // Parse the integer and decimal parts to BigInt
        const integerBigInt = BigInt(integerPart);
        const decimalBigInt = BigInt(decimalPart.padEnd(decimal, '0'));

        // Combine the integer and decimal parts to get the original BigInt value
        const originalBigInt = integerBigInt * BigInt(10 ** decimal) + decimalBigInt;

        return originalBigInt.toString();
    } catch (error) {
        return "Invalid input: not a valid formatted decimal";
    }

}

export default {
    toRaw,
    toDecimal
}

// // Example usage:
// const formattedDecimal = "1234567890123456789012345678901234567890.000"; // Include the number after the decimal point
// const originalBigInt = convertToBigInt(formattedDecimal, 3);
// console.log(originalBigInt.toString());
