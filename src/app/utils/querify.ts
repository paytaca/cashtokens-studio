// copied https://github.com/hantyrram/querify/blob/main/querify
// eslint-disable-next-line no-unused-vars
// convert object to query string
// if obj[<key>]'s value is array, converts it to key=val&key=val
export default function querify (obj:any) {
  function q (obj:any, arrkey = null) {
    return Object.keys(obj).filter((k) => {
      if (obj[k] instanceof Array) {
        return obj[k].length > 0
      }
      return true
    }).map((k) => {
      let urlquery = ''
      if (obj[k] instanceof Array) {
        for (const val of obj[k]) {
          urlquery += `${q({ [k]: val })}&`
        }
        urlquery = urlquery.substring(0, urlquery.length - 1) // remove last &
        return urlquery
      } else {
        if (obj[k] === null) {
          return urlquery
        }
        urlquery += `${k}=${obj[k]}`
        return urlquery
      }
    }).filter(x => x && x.length > 0).join('&')
  }

  let res = q(obj)
  if (res.endsWith('&')) {
    res = res.substring(0, res.length - 1)
  }
  return res
}