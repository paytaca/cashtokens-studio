export default (tokenId:string) => {
  return tokenId.replace(tokenId.substring(5, 60), '...')
}
