import compression from 'compression';
import { ssrMiddleware } from 'quasar/wrappers';
import express from 'express'

import bodyParser from 'body-parser'
import { NFTStorage, File } from 'nft.storage'
import fs from 'fs'
import crypto from 'crypto'
const multer = require('multer')
const throttle = require('express-throttle-bandwidth')
const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY || '' })



//Setting storage engine

const storage = multer.diskStorage({dest: 'uploads/'});
const upload = multer(storage)
// const tokenRouter = express.Router()

// tokenRouter.post('icon/upload', async (req:any, res:any) => {
//   console.log(req.file)
//   console.log('query', req.query)

//   const imageBlob = new Blob([req.file.buffer], { type: 'image/png' });

//   const metadata = await client.store({
//     name: 'CTStudio',
//     description: 'Test',
//     image: imageBlob
//   })

//   console.log(metadata.url)
//   res.status(200).send({
//     message: `Hi! req.method: ${req.method}, req.url: ${req.url}`,
//     metadata: 'test'
//   });
// })

export default ssrMiddleware(async ({ app, resolve }) => {

  // app.use('/api', (req, res,next) => {
  //   console.log('Hit on api')
  //   next()
  // })

  app.use(throttle(1024 * 128))

  app.get('/api/testx11', async (req:any, res:any) => {
    console.log('NFT_STORAGE_API_KEY', process.env.NFT_STORAGE_API_KEY)
    res.send({test: 'test api', NFT_STORAGE_API_KEY: process.env.NFT_STORAGE_API_KEY})
  })

  app.post('/api/tokens/icon/upload', upload.single('icon'), async (req:any, res:any) => {
    const metadata = await client.store({
      name: 'CTStudio',
      description: 'Test',
      image: new File(
        [req.file.buffer],
        `${req.query.tokenId}.png`,
        { type: 'image/png' }
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
      console.log('NFT STORAGE API KEY', process.env.NFT_STORAGE_API_KEY)
      res.status(400).send(error)
    }
    
  })

  /**
   * Stores the Registry(BCMR) json payload in nft.storage
   */
  app.post('/api/tokens/registry/storage', bodyParser.json(), async (req:any, res:any) => {

    const headers = {
      'Authorization': `Bearer ${process.env.NFT_STORAGE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Convert JSON object to JSON string
    const jsonString = JSON.stringify(req.body);
    console.log(jsonString)
    // Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a File object from the Blob
    const file = new File([blob], `${req.body.registryIdentity}.json`, { type: 'application/json' });

    try {
      const resp:any = await fetch('https://api.nft.storage/upload', {method: 'POST', headers, body: file})
      const json = await resp.json()
      console.log('CID', json)
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
      'Authorization': `Bearer ${process.env.NFT_STORAGE_API_KEY}`,
      'Content-Type': 'application/json'
    };

    let registryJsonFile = new File(
      [req.file.buffer],
      `${req.query.tokenId}.json`,
      { type: 'application/json' }
    )
    console.log('sent', req.file.buffer.toString('utf-8'))
    const hash = crypto.createHash('sha256')
    const contentHash = hash.update(req.file.buffer.toString('utf-8')).digest('hex')

    try {
      const resp:any = await fetch('https://api.nft.storage/upload', {method: 'POST', headers, body: registryJsonFile})
      const json = await resp.json()
      console.log('CID', json)
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
