import compression from 'compression';
import { ssrMiddleware } from 'quasar/wrappers';
import express from 'express'

import bodyParser from 'body-parser'
import { NFTStorage, File } from 'nft.storage'
import fs from 'fs'
import crypto from 'crypto'
const multer = require('multer')
const throttle = require('express-throttle-bandwidth')

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
  process.env.NFT_STORAGE_API_KEY_10
]


nftStorageApiKeys = nftStorageApiKeys.filter(k=>Boolean(k))

const nftStorageClients:NFTStorage[] = []

nftStorageApiKeys.forEach((apiKey)=>{
  nftStorageClients.push(new NFTStorage({ token: apiKey || ''}))
})

console.log('NFT STORAGE KEYS', nftStorageApiKeys)
console.log('NFT STORAGE clients', nftStorageClients)
const nftStorageClient = () => {
  return nftStorageClients[Math.floor(Math.random() * nftStorageClients.length)] 
}

const nftStorageApiKey = () => {
  return nftStorageApiKeys[Math.floor(Math.random() * nftStorageApiKeys.length)] 
}


//Setting storage engine

const storage = multer.diskStorage({dest: 'uploads/'});
const upload = multer(storage)

export default ssrMiddleware(async ({ app, resolve }) => {

  app.use(throttle(1024 * 128))

  app.get('/api/testx11', async (req:any, res:any) => {
    res.send({'test': 'test'})
  })

  app.post('/api/tokens/icon/upload', upload.single('icon'), async (req:any, res:any) => {
    let ext = req.file.originalname?.split('.')
    ext = ext[ext.length - 1]

    const metadata = await nftStorageClient().store({
      name: 'CTStudio',
      description: 'Test',
      image: new File(
        [req.file.buffer],
        `${req.query.tokenId}.${ext}`,
        { type: req.file.mimetype }
      )
    })
    const [metadataCid, metadataFilename] = metadata.url.replace('ipfs://','').split('/')
    try {
      const metadataContents = await fetch(`https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`)
      const {/*name, description,*/image } = await metadataContents.json()
      const [imageCid, imageFilename] = image.replace('ipfs://','').split('/')
      res.status(200).send({
        nftStorageMetadata: metadata,
        iconUris: {
          ipfs: image,
          https: `https://${imageCid}.ipfs.nftstorage.link/${imageFilename}`
        }
      });
      
    } catch (error) {
      console.log(error)
      res.status(400).send(error)
    }
    
  })

  app.post('/api/tokens/nft/asset-upload', upload.single('file'), async (req:any, res:any) => {
    
    let ext = req.file.originalname?.split('.')
    ext = ext[ext.length - 1]
    
    try {
      const metadata = await nftStorageClient().store({
        name: 'CTStudio',
        description: 'NFT asset',
        image: new File(
          [req.file.buffer],
          `${req.query.tokenId}-${req.query.commitment}.${ext}`,
          { type: req.file.mimetype }
        )
      })
      const [metadataCid, metadataFilename] = metadata.url.replace('ipfs://','').split('/')

      const metadataContents = await fetch(`https://${metadataCid}.ipfs.nftstorage.link/${metadataFilename}`)
      const {/*name, description,*/image } = await metadataContents.json()
      const [imageCid, imageFilename] = image.replace('ipfs://','').split('/')
      res.status(200).send({
        nftStorageMetadata: metadata,
        uris: {
          ipfs: image,
          https: `https://${imageCid}.ipfs.nftstorage.link/${imageFilename}`
        },
        originalFilename: req.file.originalname
      });
      
    } catch (error) {
      console.log(error)
      res.status(400).send(error)
    }
    
  })

  /**
   * Stores the Registry(BCMR) json payload in nft.storage
   */
  app.post('/api/tokens/registry/storage', bodyParser.json(), async (req:any, res:any) => {

    const headers = {
      'Authorization': `Bearer ${nftStorageApiKey()}`,
      'Content-Type': 'application/json'
    };

    // Convert JSON object to JSON string
    const jsonString = JSON.stringify(req.body);
    
    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a File object from the Blob
    const file = new File([blob], `${req.body.registryIdentity}.json`, { type: 'application/json' });

    try {
      const resp:any = await fetch('https://api.nft.storage/upload', {method: 'POST', headers, body: file})
      const json = await resp.json()
      if (json.ok) {
        const hash = crypto.createHash('sha256')
        res.status(200).send({
          artifact: {
            uris: {
              https: `https://nftstorage.link/ipfs/${json.value.cid}`,
              ipfs: `ipfs://${json.value.cid}`
            },
            contentHash: hash.update(jsonString).digest('hex')
          }
        })
      }

    } catch (error) {
      res.status(400).send(error)
    }
  })

  /**
   * Stores the Registry(BCMR) file in nft.storage
   */
  app.post('/api/tokens/registry-file/storage', upload.single('registryFile'), bodyParser.json(), async (req:any, res:any) => {
    if (!req.query.tokenId) {
      return res.status(400).json({
        error: 'Missing tokenId from query parameter'
      })
    }

    const headers = {
      'Authorization': `Bearer ${nftStorageApiKey()}`,
      'Content-Type': 'application/json'
    };

    let registryJsonFile = new File(
      [req.file.buffer],
      `${req.query.tokenId}.json`,
      { type: 'application/json' }
    )
    const hash = crypto.createHash('sha256')
    const contentHash = hash.update(req.file.buffer.toString('utf-8')).digest('hex')

    try {
      const resp:any = await fetch('https://api.nft.storage/upload', {method: 'POST', headers, body: registryJsonFile})
      const json = await resp.json()
      if (json.ok) {
        res.status(200).send({
          artifact: {
            uris: {
              https: `https://nftstorage.link/ipfs/${json.value.cid}`,
              ipfs: `ipfs://${json.value.cid}`
            },
            contentHash
          }
        })
      }

    } catch (error) {
      res.status(400).send(error)
    }
  })
});
