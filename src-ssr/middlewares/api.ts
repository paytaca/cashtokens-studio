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

    const [metadataCid, metadataFilename] = metadata.url
      .replace('ipfs://', '')
      .split('/');

    const metadataContentsResp = await fetch(
      `https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`
    );


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
    req.ipfs.error = {
      nftstorage: error,
    };
  }
  next();
};

const pinIpfsCidToPinata = async (req: any, res: any, next: any) => {
  if (req.ipfs?.artifact?.ipfsCid) {
    (async () => {
      try {
        const pinningResponse = await req.ipfs.pinata.pinByHash(
          req.ipfs.artifact.ipfsCid
        );
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
  const fileStream = new Readable();
  fileStream.push(req.file.buffer);
  fileStream.push(null);

  try {
    const pinataPinningResponse = await req.ipfs.pinata.pinFileToIPFS(
      fileStream,
      options
    );
    return res.send({
      uris: {
        ipfs: `ipfs://${pinataPinningResponse.IpfsHash}/${req.ipfs.filename}`,
        // https: `https://cashtokens-studio.mypinata.cloud/ipfs/${pinataPinningResponse.IpfsHash}/${req.ipfs.filename}`,
        https: `https://ipfs.paytaca.com/ipfs/${pinataPinningResponse.IpfsHash}/${req.ipfs.filename}`,
      },
      originalFilename: req.file.originalname,
      h: req.query.h,
      ipfsCid: pinataPinningResponse.IpfsHash,
    });
  } catch (error) {
    req.ipfs.error = {
      message: 'Error pinning file to pinata'
    };
    console.log('🚀 ~ pinMediaFileToPinata ~ req.ipfs.error:', req.ipfs.error);
  }
  next();
};

const pinJsonFileToPinata = async (req: any, res: any, next: any) => {
  if (req.ipfs.fileextension?.toLowerCase() != 'json') return next();
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
    const fileStream = Readable.from(req.file.buffer);
    (fileStream as any).path = req.ipfs.filename || 'upload.json'; 

    const pinataPinningResponse = await req.ipfs.pinata.pinFileToIPFS(
      fileStream,
      options
    );

    return res.send({
      uris: {
        ipfs: `ipfs://${pinataPinningResponse.IpfsHash}`,
        // https: `https://cashtokens-studio.mypinata.cloud/ipfs/${pinataPinningResponse.IpfsHash}`,
        https: `https://ipfs.paytaca.com/ipfs/${pinataPinningResponse.IpfsHash}`,
      },
      contentHash: req.ipfs.artifact.contentHash,
      ipfsCid: pinataPinningResponse.IpfsHash,
    });
  } catch (error) {
    req.ipfs.error = {
      message: 'Error pinning file to pinata'
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

  app.get('/api/testx113', async (req: any, res: any) => {
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
        description: 'CashTokens Studio',
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

  /**
   * Proxy endpoint for IPFS images
   * GET /api/ipfs-image?url=<ipfs-url>
   * Fetches images from IPFS gateway using server-side gateway token
   */
  app.get('/api/ipfs-image', async (req: any, res: any) => {
    const ipfsUrl = req.query.url;
    
    if (!ipfsUrl) {
      return res.status(400).json({
        error: 'Missing url query parameter',
      });
    }

    try {
      let gatewayUrl = ipfsUrl;
      const pinataGatewayToken = process.env.PINATA_GATEWAY_TOKEN;
      if (ipfsUrl.startsWith('ipfs://')) {
        const path = ipfsUrl.replace('ipfs://', '');
        const parts = path.split('/');
        const cid = parts[0];
        const filename = parts.slice(1).join('/');
        
        if (filename) {
          gatewayUrl = `https://ipfs.paytaca.com/ipfs/${cid}/${filename}`;
        } else {
          gatewayUrl = `https://ipfs.paytaca.com/ipfs/${cid}`;
        }
      } else if (ipfsUrl.includes('ipfs.nftstorage.link')) {
        const u = new URL(ipfsUrl);
        const hostParts = u.hostname.split('.');
        const cid = hostParts[0];
        const filename = u.pathname.replace(/^\//, '');
        gatewayUrl = `https://ipfs.paytaca.com/ipfs/${cid}/${filename}`;
      }

      if (pinataGatewayToken) {
        const separator = gatewayUrl.includes('?') ? '&' : '?';
        gatewayUrl = `${gatewayUrl}${separator}pinataGatewayToken=${pinataGatewayToken}`;
      }

      const response = await fetch(gatewayUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Failed to fetch image: ${response.statusText}`,
        });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({
          error: 'Resource is not an image',
          contentType,
        });
      }

      const imageBuffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      res.send(Buffer.from(imageBuffer));
    } catch (error: any) {
      console.error('Error proxying IPFS image:', error);
      res.status(500).json({
        error: error?.message || 'Failed to proxy image',
      });
    }
  });


  /**
   /**
    * Proxy endpoint for IPFS files
    * GET /api/ipfs/:cid[?filePath=<path>]
    * Fetches files from IPFS gateway using server-side gateway token
    */
  app.get('/api/ipfs/:cid', async (req: any, res: any) => {

    const cid = req.params.cid;
    const filePath = decodeURIComponent(req.query.filePath ?? '').replace(/\/+/g, '/').replace(/^\/+/, '');
    let gatewayUrl = `https://ipfs.paytaca.com/ipfs/${cid}` 
    if (filePath) {
      gatewayUrl = `${gatewayUrl}/${filePath}`;
    }
    gatewayUrl = `${gatewayUrl}?pinataGatewayToken=${process.env.PINATA_GATEWAY_TOKEN}`;

    try {
      const response = await fetch(gatewayUrl);
        
      if (!response.ok) {
        return res.status(response.status).json({
          error: `Failed to fetch resource from ipfs!`,
        });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      if (contentType.startsWith('image/')) {
        const imageBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.send(Buffer.from(imageBuffer));    
      }
      // Handle case when content is JSON (such as bitcoin-cash-metadata-registry.json)
      else if (contentType.includes('application/json') || filePath.endsWith('.json')) {
        const jsonData = await response.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.json(jsonData);
      } else {
        // For other mime types, just stream the data as octet-stream
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(buffer));
      }

    } catch (error: any) {
      res.status(500).json({
        error: error?.message || 'Internal Server Error',
      });
    }
    
  });

});
