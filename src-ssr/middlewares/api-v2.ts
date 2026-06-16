import { defineSsrMiddleware } from "@quasar/app-vite/wrappers";
import { PinataSDK } from "pinata";
import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage() })

const uploadFileMiddleware = (req: any, res: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT_V2!,
  pinataGateway: process.env.VITE_PAYTACA_IPFS_GATEWAY,
  pinataGatewayKey: process.env.PINATA_GATEWAY_TOKEN,
  
});

export default defineSsrMiddleware(({ app, resolve, render, serve }) => {

    app.get('/api/test', async (req: any, res: any) => {
        res.send({ test: 'test', t: process.env.VITE_PAYTACA_IPFS_GATEWAY, jwt: process.env.PINATA_JWT_V2 });
    });

    app.post('/api/ipfs', async (req: any, res) => {
      try {
        await uploadFileMiddleware(req, res)
        if (!req.file) {
          return res.status(400).send("No file uploaded.");
        }

        const file = new File([req.file.buffer], req.file.originalname, {
          type: req.file.mimetype,
        });

        const uploadResult = await pinata.upload.public.file(file);
        res.send(uploadResult)
      } catch (error) {
        console.log(error);
        res.send(error)
      }
  })

  app.get('/api/ipfs/:cid', async (req: any, res) => {
    try {
      const response = await pinata.gateways.public.get(req.params.cid);
      res.setHeader('Content-Type', response.contentType as string);
      if (response.data instanceof Blob) {
        const arrayBuffer = await response.data.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      } else {
        // If it's JSON or string, send as is
        res.send(response.data);
      }
    } catch (error) {
      console.log(error);
      res.send(error)
    }
  })

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
})