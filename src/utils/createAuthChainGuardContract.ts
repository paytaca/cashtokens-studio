import { Contract } from '@mainnet-cash/contract';
import contracts from 'src/resources/contracts';

export default ({ownerPubKey, network}: {ownerPubKey:any, network:any}) => {
  return new Contract(
    contracts.authChainGuard,
    [ownerPubKey],
    network
  );
}