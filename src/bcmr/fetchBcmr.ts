export default async (url: string):Promise<string|undefined> => {
  try {
    const r = await fetch(url)
    return await r.json()
  } catch (error) {
    console.log(`Error fetching BCMR from ${url}`)
  }
}
