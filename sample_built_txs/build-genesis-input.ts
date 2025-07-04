// logs of buildGenesisInputTx function
// wallet from cashonize
// wallet used cashaddress bchtest:qz97djdjktl0dvawp79a73jlq7cy95stcvx8sk9fwe
// wallet used token address: bchtest:zz97djdjktl0dvawp79a73jlq7cy95stcvpdrgt032
const { Wallet, TestNetWallet, DefaultProvider } = await import('mainnet-js');

DefaultProvider.servers.testnet = [
  'wss://chipnet.c3-soft.com:64004',
  'wss://chipnet.bch.ninja:50004',
  // 'wss://chipnet.imaginary.cash:50004',
];

const input = {
  // funds[0] the only input we use
  // this input was created on this tx
  txid: '50ff0c143c1c0e364d9dbf9cfedc0181c9a34415f4395d0a724259ebda1fc45e',
  vout: 1,
  satoshis: 915862,
  height: 241619,
  token: undefined,
};

// decoded transaction
const decoded = {
  inputs: [
    {
      outpointIndex: 1,
      outpointTransactionHash: [
        // Uint8Array(25)
        80, 255, 12, 20, 60, 28, 14, 54, 77, 157, 191, 156, 254, 220, 1, 129,
        201, 163, 68, 21, 244, 57, 93, 10, 114, 66, 89, 235, 218, 31, 196, 94,
      ], // binToHex(outpointTransactionHash) = 50ff0c143c1c0e364d9dbf9cfedc0181c9a34415f4395d0a724259ebda1fc45e,
      sequenceNumber: 0,
      unlockingBytecode: [], // an empty Uint8Array
    },
  ],
  locktime: 0,
  outputs: [
    {
      // 0 the genesis input (v-out0) sent to the same wallet
      lockingBytecode: [
        //Uint8Array(25)
        118, 169, 20, 139, 230, 201, 178, 178, 254, 246, 179, 174, 15, 139, 223,
        70, 95, 7, 176, 66, 210, 11, 195, 136, 172,
      ], // binToHex(outputs[0].lockingBytecode) = 76a9148be6c9b2b2fef6b3ae0f8bdf465f07b042d20bc388ac,
      valueSatoshis: 1000n, // we set this in the app DEFAULT_TOKEN_VALUE, since this will become the IDENTITY OUTPUT we attach 1k sats to it
    },
    {
      // 1 change sent to the same wallet by mainnetjs
      lockingBytecode: [
        {
          // Uint8Array(25) same as above it's just when we copy from console it turns it into an object
          '0': 118,
          '1': 169,
          '2': 20,
          '3': 139,
          '4': 230,
          '5': 201,
          '6': 178,
          '7': 178,
          '8': 254,
          '9': 246,
          '10': 179,
          '11': 174,
          '12': 15,
          '13': 139,
          '14': 223,
          '15': 70,
          '16': 95,
          '17': 7,
          '18': 176,
          '19': 66,
          '20': 210,
          '21': 11,
          '22': 195,
          '23': 136,
          '24': 172,
        },
      ], // binToHex(outputs[1].lockingBytecode) = 76a9148be6c9b2b2fef6b3ae0f8bdf465f07b042d20bc388ac,
      valueSatoshis: 914631n, // this would be the change, this seem to be automatically produced by mainnetjs for this particular transaction
    },
  ],
};

const encodedTransaction =
  '02000000015ec41fdaeb5942720a5d39f41544a3c98101dcfe9cbf9d4d360e1c3c140cff5001000000000000000002e8030000000000001976a9148be6c9b2b2fef6b3ae0f8bdf465f07b042d20bc388acc7f40d00000000001976a9148be6c9b2b2fef6b3ae0f8bdf465f07b042d20bc388ac00000000';

const sourceOutputs = [
  {
    // THIS IS INPUT 0 ABOVE, i guess we are passing a full info of the input being used to the wallet
    lockingBytecode: [
      {
        // Note this is Uint8Array(25)
        '0': 118,
        '1': 169,
        '2': 20,
        '3': 139,
        '4': 230,
        '5': 201,
        '6': 178,
        '7': 178,
        '8': 254,
        '9': 246,
        '10': 179,
        '11': 174,
        '12': 15,
        '13': 139,
        '14': 223,
        '15': 70,
        '16': 95,
        '17': 7,
        '18': 176,
        '19': 66,
        '20': 210,
        '21': 11,
        '22': 195,
        '23': 136,
        '24': 172,
      },
    ], // binToHex(sourceOutputs.lockingBytecode) = 76a9148be6c9b2b2fef6b3ae0f8bdf465f07b042d20bc388ac
    outpointIndex: 1,
    outpointTransactionHash: [
      {
        // note this is Uint8Array(32)
        '0': 80,
        '1': 255,
        '2': 12,
        '3': 20,
        '4': 60,
        '5': 28,
        '6': 14,
        '7': 54,
        '8': 77,
        '9': 157,
        '10': 191,
        '11': 156,
        '12': 254,
        '13': 220,
        '14': 1,
        '15': 129,
        '16': 201,
        '17': 163,
        '18': 68,
        '19': 21,
        '20': 244,
        '21': 57,
        '22': 93,
        '23': 10,
        '24': 114,
        '25': 66,
        '26': 89,
        '27': 235,
        '28': 218,
        '29': 31,
        '30': 196,
        '31': 94,
      },
    ], // binToHex(sourceOutputs.outpointTransactionhash) = 50ff0c143c1c0e364d9dbf9cfedc0181c9a34415f4395d0a724259ebda1fc45e
    sequenceNumber: 0,
    token: undefined,
    unlockingByteCode: new Uint8Array(), // this is empty
    valueSatoshis: 915862n,
  },
];

// in paytaca the transaction inputs suddenly contains sourceOutput field
// the below data is not related to the above data but this is a real data from a tx passed
// by cashtokens studio to paytaca

decoded.inputs[n].sourceOutput = {
  outpointIndex: 1,
  outpointTransactionHash: {
    '0': 228,
    '1': 136,
    '2': 199,
    '3': 30,
    '4': 11,
    '5': 18,
    '6': 74,
    '7': 216,
    '8': 152,
    '9': 179,
    '10': 247,
    '11': 25,
    '12': 119,
    '13': 12,
    '14': 202,
    '15': 219,
    '16': 176,
    '17': 216,
    '18': 172,
    '19': 133,
    '20': 147,
    '21': 255,
    '22': 201,
    '23': 20,
    '24': 200,
    '25': 174,
    '26': 24,
    '27': 94,
    '28': 98,
    '29': 175,
    '30': 217,
    '31': 152,
  },
  sequenceNumber: 0,
  unlockingBytecode: {},
  lockingBytecode: {
    '0': 118,
    '1': 169,
    '2': 20,
    '3': 213,
    '4': 90,
    '5': 177,
    '6': 193,
    '7': 236,
    '8': 216,
    '9': 202,
    '10': 93,
    '11': 132,
    '12': 82,
    '13': 62,
    '14': 88,
    '15': 98,
    '16': 247,
    '17': 14,
    '18': 75,
    '19': 213,
    '20': 40,
    '21': 139,
    '22': 5,
    '23': 136,
    '24': 172,
  },
  valueSatoshis: '8728',
  address: 'bitcoincash:qr244vwpanvv5hvy2gl9schhpe9a22ytq5laj4lxys',
};
