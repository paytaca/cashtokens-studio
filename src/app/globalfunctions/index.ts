import { CashToken } from "../CashToken";

/**
 * Put any functions that doesn't depend on components here.
 */

/**
 *  @param {CashToken} cashToken instance of CashToken. Pass a clone.
 */
export const buildAuthchain = async(cashToken: CashToken) => {
  console.log('BUILDING AUTHCHAIN')
  await cashToken.buildAuthChainInChainGraph()
}