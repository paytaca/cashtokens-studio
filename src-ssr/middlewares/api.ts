import { ssrMiddleware } from 'quasar/wrappers';
import bodyParser from 'body-parser';
import { NFTStorage, File } from 'nft.storage';
import crypto from 'crypto';
import { type Request } from 'express';
import PinataSDK from '@pinata/sdk';
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

const pinCIDOnPinata = async (cid: string) => {
  const pinata = new PinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_API_SECRET
  );
  try {
    const pinningResponse = await pinata.pinByHash(cid);
    console.log('🚀 ~ pinCIDOnPinata ~ cid:', cid);
    console.log('🚀 ~ pinCIDOnPinata ~ pinningResponse:', pinningResponse);
  } catch (error) {
    console.log('🚀 ~ pinCIDOnPinata ~ pinningResponse:', error);
  }
};

const pinFileToIPFS = async (
  req: MulterRequest,
  resourceType: 'media' | 'json',
  filename: string,
  serviceProvider: 'nftstorage' | 'pinata' = 'nftstorage'
): Promise<IpfsUploadArtifact | undefined> => {
  if (serviceProvider === 'nftstorage') {
    const nftStorageStoreName = 'CTStudio';
    const nftStorageStoreDescription = 'CTStudio pins';

    if (resourceType === 'media') {
      const metadata = await nftStorageClient().store({
        name: nftStorageStoreName,
        description: nftStorageStoreDescription,
        image: new File([req.file.buffer], filename, {
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
        throw new Error('Error fetching metadata from nftstorage!');
      }

      const { /*name, description,*/ image } =
        await metadataContentsResp.json();
      const [cid, fname] = image.replace('ipfs://', '').split('/');

      return {
        uris: {
          ipfs: `ipfs://${cid}/${fname}`,
          https: `https://nftstorage.link/ipfs/${cid}/${fname}`,
        },
        ipfsCid: cid,
      };
    }

    // If json, e.g. BCMR
    if (resourceType === 'json') {
      const headers = {
        Authorization: `Bearer ${nftStorageApiKey()}`,
        'Content-Type': 'application/json',
      };

      const resp: any = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers,
        body: req.file,
      });

      if (!resp.ok) {
        throw new Error('Error uploading json file to nftstorage!');
      }
      const json = await resp.json();
      return {
        uris: {
          ipfs: `ipfs://${json.value.cid}`,
          https: `https://nftstorage.link/ipfs/${json.value.cid}`,
        },
        ipfsCid: json.value.cid,
      };
    }
  }
  if (serviceProvider === 'pinata') {
    const pinata = new PinataSDK(
      process.env.PINATA_API_KEY,
      process.env.PINATA_API_SECRET
    );

    let options = {
      pinataOptions: {
        cidVersion: 1 as 0 | 1 | undefined,
        wrapWithDirectory: true,
      },
    };
    if (resourceType === 'json') {
      options.pinataOptions.wrapWithDirectory = false;
    }
    const pinataPinningResponse = await pinata.pinFileToIPFS(
      req.file.buffer,
      options
    );
    console.log('🚀 ~ pinataPinningResponse:', pinataPinningResponse);

    return {
      uris: {
        ipfs: `ipfs://${pinataPinningResponse.IpfsHash}/${filename}`,
        https: `https://cashtokens-studio.mypinata.cloud/ipfs/${pinataPinningResponse.IpfsHash}/${filename}`,
      },
      ipfsCid: pinataPinningResponse.IpfsHash,
    };
  }
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
        pinCIDOnPinata(imageCid);
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
        pinCIDOnPinata(imageCid);
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
        pinCIDOnPinata(imageCid);
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
          pinCIDOnPinata(json.value.cid);
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
          pinCIDOnPinata(json.value.cid);
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
    '/api/ipfs/media',
    upload.single('file'),
    bodyParser.json(),
    async (req: any, res: any) => {
      let filename: string;
      let ext = req.file.originalname?.split('.');
      ext = ext[ext.length - 1];
      filename = req.query.tokenId;
      if (req.query.commitment) {
        filename += `-${req.query.commitment}`;
      }
      filename += `.${ext}`;

      let artifact: IpfsUploadArtifact | undefined;

      try {
        artifact = await pinFileToIPFS(
          req.file.buffer,
          'media',
          filename,
          'nftstorage'
        );
      } catch (error) {
        console.log('🚀 ~ Error pinning to nftstorage:', error);
      }

      if (artifact?.ipfsCid) {
        const pinByCid = await pinCIDOnPinata(artifact.ipfsCid);
        console.log('🚀 ~ pinByCid:', pinByCid);
      } else {
        try {
          artifact = await pinFileToIPFS(
            req.file.buffer,
            'media',
            filename,
            'nftstorage'
          );
        } catch (error) {
          console.log('🚀 ~ error pinning file to pinata:', error);
        }
      }

      if (!artifact?.ipfsCid) {
        return res.status(400).send('Error uploading file to ipfs');
      }
      return res.send(artifact);
    }
  );

  app.post(
    '/api/ipfs/bcmr',
    upload.single('file'),
    bodyParser.json(),
    async (req: any, res: any) => {}
  );
});
