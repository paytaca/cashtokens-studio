export const DEFAULT_TOKEN_VALUE = 1000
export const MIN_TOKEN_VALUE = 800
// export const MAX_FUNGIBLE_AMOUNT = '9007199254740991' // SAFE INTEGER
export const MAX_FUNGIBLE_AMOUNT = '9223372036854775807'
export const CTS_MINTING_TOKEN_DEFAULT_COMMITMENT = 'feed' // actual default commitment value of minters
export const CTS_MINTING_TOKEN_DEFAULT_DUMMY_COMMITMENT = 'ctsfeed782974771942$%&*@(&#(@&' // default commitment value in forms, because the user might actually need to use `feed`
// EVENT BUS EVENTS
export const ADDRESS_WATCHER_TRIGGERED = 1
export const TOKEN_CATEGORY_CACHE_MAX_KEYS = 1000
export const TOKEN_URIS_CACHE_MAX_KEYS = 1000
export const AUTHGUARD_CONTRACT_SCRIPT = `
pragma cashscript ^0.8.0;

contract AuthGuard(bytes tokenId) {
  function unlockWithNft(bool keepGuarded) {
    // Check that the first input holds the minting baton
    require(tx.inputs[1].tokenCategory == tokenId);
    require(tx.inputs[1].tokenAmount == 0);
    if(keepGuarded){
      // Self preservation of the minting covenant as the first output
      require(tx.outputs[0].lockingBytecode == tx.inputs[this.activeInputIndex].lockingBytecode);
    }
  }
}`