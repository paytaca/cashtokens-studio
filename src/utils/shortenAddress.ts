export default (address?: string) => {
  if (!address) return '...'
  return address.replace(address.substring(14,46), '...')
}
