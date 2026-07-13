export default (tokenId = '') => {
  return (tokenId || '').replace(tokenId.substring(5, 60), '...')
}
