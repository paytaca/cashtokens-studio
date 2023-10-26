export const DEFAULT_TOKEN_VALUE = 1000
export const MIN_TOKEN_VALUE = 800
export const MAX_FUNGIBLE_AMOUNT = '9007199254740991' // SAFE INTEGER
// export const MAX_FUNGIBLE_AMOUNT = '9223372036854769664' // WHAT MAINNETJS CAN HANDLE
// export const MAX_FUNGIBLE_AMOUNT = '9223372036854770000' // - 9223372036854775807 - 5807 number limit, change when mainnet-js uses bigint
export const CTS_MINTING_TOKEN_DEFAULT_COMMITMENT = 'feed' // actual default commitment value of minters
export const CTS_MINTING_TOKEN_DEFAULT_DUMMY_COMMITMENT = 'ctsfeed782974771942$%&*@(&#(@&' // default commitment value in forms, because the user might actually need to use `feed`
// EVENT BUS EVENTS
export const ADDRESS_WATCHER_TRIGGERED = 1
export const TOKEN_CATEGORY_CACHE_MAX_KEYS = 1000
export const TOKEN_URIS_CACHE_MAX_KEYS = 1000
