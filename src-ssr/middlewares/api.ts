import { ssrMiddleware } from 'quasar/wrappers';
import bodyParser from 'body-parser';
import { NFTStorage, File } from 'nft.storage';
import crypto from 'crypto';
import { type Request } from 'express';
import PinataSDK from '@pinata/sdk';
import fs from 'fs';
import { Readable } from 'stream';
const multer = require('multer');
const throttle = require('express-throttle-bandwidth');

interface MulterRequest extends Request {
  file: any;
}

export type IpfsUploadArtifact = {
  uris: {
    ipfs: string;
    https: string;
  };
  contentHash?: string;
  originalFilename?: string;
  h?: string;
  ipfsCid: string;
};

let nftStorageApiKeys = [
  process.env.NFT_STORAGE_API_KEY_1,
  process.env.NFT_STORAGE_API_KEY_2,
  process.env.NFT_STORAGE_API_KEY_3,
  process.env.NFT_STORAGE_API_KEY_4,
  process.env.NFT_STORAGE_API_KEY_5,
  process.env.NFT_STORAGE_API_KEY_6,
  process.env.NFT_STORAGE_API_KEY_7,
  process.env.NFT_STORAGE_API_KEY_8,
  process.env.NFT_STORAGE_API_KEY_9,
  process.env.NFT_STORAGE_API_KEY_10,
];

nftStorageApiKeys = nftStorageApiKeys.filter((k) => Boolean(k));

const nftStorageClients: NFTStorage[] = [];

nftStorageApiKeys.forEach((apiKey) => {
  nftStorageClients.push(new NFTStorage({ token: apiKey || '' }));
});

console.log('🚀 ~ nftStorageApiKeys:', nftStorageApiKeys);
console.log('🚀 ~ nftStorageClients:', nftStorageClients);

const nftStorageClient = () => {
  return nftStorageClients[
    Math.floor(Math.random() * nftStorageClients.length)
  ];
};

const nftStorageApiKey = () => {
  return nftStorageApiKeys[
    Math.floor(Math.random() * nftStorageApiKeys.length)
  ];
};

//Setting storage engine

const storage = multer.diskStorage({ dest: 'uploads/' });
const upload = multer(storage);

const pinCidToPinata = async (cid: string) => {
  const pinata = new PinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_API_SECRET
  );
  try {
    const pinningResponse = await pinata.pinByHash(cid);
    console.log('🚀 ~ pinCidToPinata ~ cid:', cid);
    console.log('🚀 ~ pinCidToPinata ~ pinningResponse:', pinningResponse);
  } catch (error) {
    console.log('🚀 ~ pinCidToPinata ~ pinningResponse:', error);
  }
};

const nftStorageStoreName = 'CTStudio';
const nftStorageStoreDescription = 'CTStudio pins';

const init = async (req: any, res: any, next: any) => {
  req.ipfs = {
    artifact: {},
  };

  if (req.file?.originalname) {
    let ext = req.file.originalname?.split('.');
    ext = ext[ext.length - 1];
    if (ext) {
      let filename = `${req.query.tokenId}`;
      if (req.query.commitment) {
        filename += `-${req.query.commitment}`;
      }
      filename += `.${ext}`;
      req.ipfs.fileextension = ext;
      req.ipfs.filename = filename;
    }
  }

  console.log('request is json', req.is('json'));

  if (req.ipfs?.fileextension?.toLowerCase() == 'json') {
    const hash = crypto.createHash('sha256');
    let contentHash: string | undefined = undefined;
    if (req.file) {
      contentHash = hash
        .update(req.file.buffer.toString('utf-8'))
        .digest('hex');
    }
    req.ipfs.artifact.contentHash = contentHash;
    req.ipfs.filename = `${req.ipfs.filename || 'bcmr.json'}`;
  }

  console.log('🚀 ~ init:', req.ipfs);

  const pinata = new PinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_API_SECRET
  );

  req.ipfs.pinata = pinata;

  next();
};

const pinMediaFileToNftStorage = async (req: any, res: any, next: any) => {
  if (req.ipfs?.fileextension?.toLowerCase() == 'json') return next();

  try {
    const metadata = await nftStorageClient().store({
      name: nftStorageStoreName,
      description: nftStorageStoreDescription,
      image: new File([req.file.buffer], req.ipfs.filename, {
        type: req.file.mimetype,
      }),
    });
    console.log('METADATA', metadata);

    const [metadataCid, metadataFilename] = metadata.url
      .replace('ipfs://', '')
      .split('/');

    const metadataContentsResp = await fetch(
      `https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`
    );

    console.log('metadataCid', metadataCid);

    if (!metadataContentsResp.ok) {
      return next();
    }

    const { /*name, description,*/ image } = await metadataContentsResp.json();
    const [cid, fname] = image.replace('ipfs://', '').split('/');

    req.ipfs.artifact = {
      uris: {
        ipfs: `ipfs://${cid}/${fname}`,
        https: `https://nftstorage.link/ipfs/${cid}/${fname}`,
      },
      originalFilename: req.file.originalname,
      h: req.query.h,
      ipfsCid: cid,
    };
  } catch (error) {
    console.log('🚀 ~ pinMediaFileToNftStorage ~ error:', error);
    req.ipfs.error = {
      nftstorage: error,
    };
  }
  console.log(
    '🚀 ~ pinMediaFileToNftStorage ~ req.ipfs.artifact:',
    req.ipfs.artifact
  );
  next();
};

const pinJsonToNftStorage = async (req: any, res: any, next: any) => {
  if (req.ipfs.fileextension?.toLowerCase() != 'json') return next();

  const headers = {
    Authorization: `Bearer ${nftStorageApiKey()}`,
    'Content-Type': 'application/json',
  };

  try {
    let jsonFile = new File([req.file.buffer], req.ipfs.filename, {
      type: 'application/json',
    });
    const resp: any = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers,
      body: jsonFile,
    });

    if (!resp.ok) {
      return next();
    }
    const json = await resp.json();
    req.ipfs.artifact = {
      uris: {
        ipfs: `ipfs://${json.value.cid}`,
        https: `https://nftstorage.link/ipfs/${json.value.cid}`,
      },
      contentHash: req.ipfs.artifact?.contentHash,
      ipfsCid: json.value.cid,
    };
  } catch (error) {
    console.log('🚀 ~ pinJsonToNftStorage ~ error:', error);
    req.ipfs.error = {
      nftstorage: error,
    };
  }
  console.log(
    '🚀 ~ pinJsonToNftStorage ~ req.ipfs.artifact:',
    req.ipfs.artifact
  );
  next();
};

const pinIpfsCidToPinata = async (req: any, res: any, next: any) => {
  if (req.ipfs?.artifact?.ipfsCid) {
    (async () => {
      try {
        const pinningResponse = await req.ipfs.pinata.pinByHash(
          req.ipfs.artifact.ipfsCid
        );
        console.log('🚀 ~ pinCidToPinata ~ cid:', req.ipfs.artifact.ipfsCid);
        console.log('🚀 ~ pinCidToPinata ~ pinningResponse:', pinningResponse);
      } catch (error) {
        console.log('🚀 ~ pinCidToPinata ~ pinningResponse:', error);
      }
    })();

    return res.send({ ...req.ipfs.artifact });
  }
  next();
};

const pinMediaFileToPinata = async (req: any, res: any, next: any) => {
  if (req.ipfs?.fileextension?.toLowerCase() == 'json') return next();

  let options = {
    pinataOptions: {
      cidVersion: 1 as 0 | 1 | undefined,
      wrapWithDirectory: true,
    },
    pinataMetadata: {
      name: req.ipfs.filename,
    },
  };
  console.log('FILE', req.file);

  const fileStream = new Readable();
  fileStream.push(req.file.buffer);
  fileStream.push(null);

  try {
    const pinataPinningResponse = await req.ipfs.pinata.pinFileToIPFS(
      fileStream,
      options
    );
    console.log('🚀 ~ pinataPinningResponse:', pinataPinningResponse);
    return res.send({
      uris: {
        ipfs: `ipfs://${pinataPinningResponse.IpfsHash}/${req.ipfs.filename}`,
        https: `https://cashtokens-studio.mypinata.cloud/ipfs/${pinataPinningResponse.IpfsHash}/${req.ipfs.filename}`,
      },
      originalFilename: req.file.originalname,
      h: req.query.h,
      ipfsCid: pinataPinningResponse.IpfsHash,
    });
  } catch (error) {
    req.ipfs.error = {
      ...req.ipfs.error,
      pinata: error,
    };
    console.log('🚀 ~ pinMediaFileToPinata ~ req.ipfs.error:', req.ipfs.error);
  }
  next();
};

const pinJsonFileToPinata = async (req: any, res: any, next: any) => {
  if (req.ipfs.fileextension?.toLowerCase() != 'json') return next();
  console.log('Pinning file to pinata');
  let options = {
    pinataOptions: {
      cidVersion: 1 as 0 | 1 | undefined,
      wrapWithDirectory: false,
    },
    pinataMetadata: {
      name: req.ipfs.filename,
    },
  };

  try {
    const fileStream = new Readable();
    fileStream.push(req.file.buffer);
    // if (req.file?.buffer) {
    //   fileStream.push(req.file.buffer); // Push buffer data to the stream
    // }
    // else if (req.body) {
    //   const jsonString = JSON.stringify(req.body);
    //   fileStream.push(Buffer.from(jsonString));
    // }

    fileStream.push(null);

    const pinataPinningResponse = await req.ipfs.pinata.pinFileToIPFS(
      fileStream,
      options
    );
    console.log('🚀 ~ pinataPinningResponse:', pinataPinningResponse);

    return res.send({
      uris: {
        ipfs: `ipfs://${pinataPinningResponse.IpfsHash}`,
        https: `https://cashtokens-studio.mypinata.cloud/ipfs/${pinataPinningResponse.IpfsHash}`,
      },
      contentHash: req.ipfs.artifact.contentHash,
      ipfsCid: pinataPinningResponse.IpfsHash,
    });
  } catch (error) {
    req.ipfs.error = {
      ...req.ipfs.error,
      pinata: error,
    };
    console.log('🚀 ~ pinJsonFileToPinata ~ error:', req.ipfs.error);
  }
  next();
};

const handleIpfsError = (req: any, res: any) => {
  res.status(400).send({
    ...req.ipfs.error,
  });
};

export default ssrMiddleware(async ({ app, resolve }) => {
  app.use(throttle(1024 * 128));

  app.get('/api/testx11', async (req: any, res: any) => {
    res.send({ test: 'test' });
  });

  app.post(
    '/api/tokens/icon/upload',
    upload.single('icon'),
    async (req: any, res: any) => {
      let ext = req.file.originalname?.split('.');
      ext = ext[ext.length - 1];

      const metadata = await nftStorageClient().store({
        name: 'CTStudio',
        description: 'Test',
        image: new File([req.file.buffer], `${req.query.tokenId}.${ext}`, {
          type: req.file.mimetype,
        }),
      });
      const [metadataCid, metadataFilename] = metadata.url
        .replace('ipfs://', '')
        .split('/');
      try {
        const metadataContents = await fetch(
          `https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`
        );
        const { /*name, description,*/ image } = await metadataContents.json();
        const [imageCid, imageFilename] = image
          .replace('ipfs://', '')
          .split('/');
        pinCidToPinata(imageCid);
        res.status(200).send({
          nftStorageMetadata: metadata,
          iconUris: {
            ipfs: image,
            https: `https://${imageCid}.ipfs.nftstorage.link/${imageFilename}`,
          },
        });
      } catch (error) {
        console.log(error);
        res.status(400).send(error);
      }
    }
  );

  app.post(
    '/api/tokens/nft/icon-upload',
    upload.single('icon'),
    async (req: any, res: any) => {
      let ext = req.file.originalname?.split('.');
      ext = ext[ext.length - 1];

      try {
        const metadata = await nftStorageClient().store({
          name: 'CTStudio',
          description: 'NFT asset',
          image: new File(
            [req.file.buffer],
            `${req.query.tokenId}-${req.query.commitment}.${ext}`,
            { type: req.file.mimetype }
          ),
        });
        const [metadataCid, metadataFilename] = metadata.url
          .replace('ipfs://', '')
          .split('/');

        const metadataContents = await fetch(
          `https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`
        );
        const { /*name, description,*/ image } = await metadataContents.json();
        const [imageCid, imageFilename] = image
          .replace('ipfs://', '')

          .split('/');
        pinCidToPinata(imageCid);
        res.status(200).send({
          nftStorageMetadata: metadata,
          uris: {
            ipfs: image,
            https: `https://${imageCid}.ipfs.nftstorage.link/${imageFilename}`,
          },
          originalFilename: req.file.originalname,
          h: req.query.h,
        });
      } catch (error) {
        console.log(error);
        res.status(400).send(error);
      }
    }
  );

  app.post(
    '/api/tokens/nft/asset-upload',
    upload.single('file'),
    async (req: any, res: any) => {
      let ext = req.file.originalname?.split('.');
      ext = ext[ext.length - 1];

      try {
        const metadata = await nftStorageClient().store({
          name: 'CTStudio',
          description: 'NFT asset',
          image: new File(
            [req.file.buffer],
            `${req.query.tokenId}-${req.query.commitment}.${ext}`,
            { type: req.file.mimetype }
          ),
        });
        const [metadataCid, metadataFilename] = metadata.url
          .replace('ipfs://', '')
          .split('/');

        const metadataContents = await fetch(
          `https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`
        );
        const { /*name, description,*/ image } = await metadataContents.json();
        const [imageCid, imageFilename] = image
          .replace('ipfs://', '')
          .split('/');
        pinCidToPinata(imageCid);
        res.status(200).send({
          nftStorageMetadata: metadata,
          uris: {
            ipfs: image,
            https: `https://${imageCid}.ipfs.nftstorage.link/${imageFilename}`,
          },
          originalFilename: req.file.originalname,
          h: req.query.h,
        });
      } catch (error) {
        console.log(error);
        res.status(400).send(error);
      }
    }
  );

  /**
   * Stores the Registry(BCMR) json payload in nft.storage
   */
  app.post(
    '/api/tokens/registry/storage',
    bodyParser.json({ limit: '30mb' }),
    async (req: any, res: any) => {
      const headers = {
        Authorization: `Bearer ${nftStorageApiKey()}`,
        'Content-Type': 'application/json',
      };

      // Convert JSON object to JSON string
      const jsonString = JSON.stringify(req.body);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create a File object from the Blob
      const file = new File([blob], `${req.body.registryIdentity}.json`, {
        type: 'application/json',
      });

      try {
        const resp: any = await fetch('https://api.nft.storage/upload', {
          method: 'POST',
          headers,
          body: file,
        });
        const json = await resp.json();
        if (json.ok) {
          const hash = crypto.createHash('sha256');
          pinCidToPinata(json.value.cid);
          res.status(200).send({
            artifact: {
              uris: {
                https: `https://nftstorage.link/ipfs/${json.value.cid}`,
                ipfs: `ipfs://${json.value.cid}`,
              },
              contentHash: hash.update(jsonString).digest('hex'),
            },
          });
        }
      } catch (error) {
        res.status(400).send(error);
      }
    }
  );

  /**
   * Stores the Registry(BCMR) file in nft.storage
   */
  app.post(
    '/api/tokens/registry-file/storage',
    upload.single('registryFile'),
    bodyParser.json(),
    async (req: any, res: any) => {
      if (!req.query.tokenId) {
        return res.status(400).json({
          error: 'Missing tokenId from query parameter',
        });
      }

      const headers = {
        Authorization: `Bearer ${nftStorageApiKey()}`,
        'Content-Type': 'application/json',
      };

      let registryJsonFile = new File(
        [req.file.buffer],
        `${req.query.tokenId}.json`,
        { type: 'application/json' }
      );
      const hash = crypto.createHash('sha256');
      const contentHash = hash
        .update(req.file.buffer.toString('utf-8'))
        .digest('hex');

      try {
        const resp: any = await fetch('https://api.nft.storage/upload', {
          method: 'POST',
          headers,
          body: registryJsonFile,
        });
        const json = await resp.json();
        if (json.ok) {
          pinCidToPinata(json.value.cid);
          res.status(200).send({
            artifact: {
              uris: {
                https: `https://nftstorage.link/ipfs/${json.value.cid}`,
                ipfs: `ipfs://${json.value.cid}`,
              },
              contentHash,
            },
          });
        }
      } catch (error) {
        res.status(400).send(error);
      }
    }
  );

  // app.post(
  //   '/api/ipfs/media',
  //   upload.single('file'),
  //   bodyParser.json(),
  //   async (req: any, res: any) => {
  //     let filename: string;
  //     let ext = req.file.originalname?.split('.');
  //     ext = ext[ext.length - 1];
  //     filename = req.query.tokenId;
  //     if (req.query.commitment) {
  //       filename += `-${req.query.commitment}`;
  //     }
  //     filename += `.${ext}`;

  //     let artifact: IpfsUploadArtifact | undefined;

  //     try {
  //       artifact = await pinMediaFileToNftStorage(req.file.buffer, filename);
  //     } catch (error) {
  //       console.log('🚀 ~ Error pinning to nftstorage:', error);
  //     }

  //     if (artifact?.ipfsCid) {
  //       const pinByCid = await pinCidToPinata(artifact.ipfsCid);
  //       console.log('🚀 ~ pinByCid:', pinByCid);
  //     } else {
  //       try {
  //         artifact = await pinMediaFileToPinata(req.file.buffer, filename);
  //       } catch (error) {
  //         console.log('🚀 ~ error pinning file to pinata:', error);
  //       }
  //     }

  //     if (!artifact?.ipfsCid) {
  //       return res.status(400).send('Error uploading file to ipfs');
  //     }
  //     artifact.h = req.query.h;
  //     return res.send(artifact);
  //   }
  // );

  // app.post(
  //   '/api/ipfs/bcmr',
  //   upload.single('file'),
  //   bodyParser.json(),
  //   async (req: any, res: any) => {
  //     if (!req.file?.buffer) {
  //       const jsonString = JSON.stringify(req.body);

  //       const blob = new Blob([jsonString], { type: 'application/json' });
  //       // Create a File object from the Blob
  //       const file = new File([blob], `${req.query.tokenId}.json`, {
  //         type: 'application/json',
  //       });
  //       req.file = file;
  //     }

  //     const hash = crypto.createHash('sha256');
  //     const contentHash = hash
  //       .update(req.file.buffer.toString('utf-8'))
  //       .digest('hex');

  //     let artifact: IpfsUploadArtifact | undefined;

  //     try {
  //       artifact = await pinJsonFileToNftStorage(req);
  //     } catch (error) {
  //       console.log('🚀 ~ Error pinning to nftstorage:', error);
  //     }

  //     if (artifact?.ipfsCid) {
  //       const pinByCid = await pinCidToPinata(artifact.ipfsCid);
  //       console.log('🚀 ~ pinByCid:', pinByCid);
  //     } else {
  //       try {
  //         artifact = await pinJsonFileToPinata(req.file.buffer);
  //       } catch (error) {
  //         console.log('🚀 ~ error pinning file to pinata:', error);
  //       }
  //     }

  //     if (!artifact?.ipfsCid) {
  //       return res.status(400).send('Error uploading file to ipfs');
  //     }
  //     artifact.contentHash = contentHash;
  //     return res.send(artifact);
  //   }
  // );

  app.post(
    '/api/ipfs',
    upload.single('file'),
    bodyParser.json(),
    init,
    // pinMediaFileToNftStorage,
    // pinJsonToNftStorage,
    // pinIpfsCidToPinata,
    pinMediaFileToPinata,
    pinJsonFileToPinata,
    handleIpfsError
  );
});
