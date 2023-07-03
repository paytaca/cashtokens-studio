export default {
  authChainGuard: `contract AuthchainGuard(pubkey ownerPubKey) {
    function TransferOrUpdateOrBurn(pubkey newOwnerPubKey, sig ownerSignature) {
      // Require owner's signature for all operations
      require(checkSig(ownerSignature, ownerPubKey));
  
      bytes spentFrom = tx.inputs[this.activeInputIndex].lockingBytecode;
      // If locking bytecode is not being changed then this is an update.
      if (
        tx.outputs[0].lockingBytecode
        == spentFrom
      ) {
        // Update
        require(newOwnerPubKey == 0x);
  
        // Require input index 0 so multiple autchains with this contract
        // can't be accidentially and irreversibly merged.
        require(this.activeInputIndex == 0);
      }
      // Allow only clearly intentional burn form:
      // OP_RETURN <'BURN'> <this_inputs_outpoint_hash>
      else if (
        tx.outputs[0].lockingBytecode
        == 0x6a + 0x04 + bytes("BURN")
          + 0x20 + tx.inputs[this.activeInputIndex].outpointTransactionHash
      ) {
        // Burn
        require(newOwnerPubKey == 0x);
      }
      else {
        // Self-mutate the covenant to be owned by newOwnerPubKey
        require(newOwnerPubKey.length == 33);
        bytes oldRedeemTail = this.activeBytecode.split(34)[1];
        bytes newRedeemScript = 0x21 + bytes(newOwnerPubKey) + oldRedeemTail;
        require(
          tx.outputs[0].lockingBytecode
          == 0xa914 + hash160(newRedeemScript) + 0x87
        );
  
        // Require input index 0 so multiple autchains with this contract
        // can't be accidentially and irreversibly merged.
        require(this.activeInputIndex == 0);
      }
    }
  }`
}