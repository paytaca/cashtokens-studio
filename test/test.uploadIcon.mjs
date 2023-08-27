
import fs from 'fs'
it.skip('uploads file', async () => {
  console.log(process.cwd())
  const buffer = fs.readFileSync('tests/icon.png')
  const formData = new FormData()
  const imageBlob = new Blob([buffer], { type: 'image/png' });
  formData.append('icon', imageBlob)
  const r = await fetch('http://localhost:8080/api/tokens/icon/upload?tokenId=mytokenId', {method: 'POST', body: formData})

  const rr = await r.json()
  console.log(rr)
}, 10000)
