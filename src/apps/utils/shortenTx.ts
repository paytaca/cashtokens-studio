export default (txid: string) => {
  return (txid || '').replace((txid || '').substring(5, 60), '...');
};
