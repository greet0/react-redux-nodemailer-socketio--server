const fs = require('fs')
const https = require('https')
const http = require('http')
const { basename } = require('path')
const { URL } = require('url')

const TIMEOUT = 10000

function download(url, dest) {
  const uri = new URL(url)
  if (!dest) {
    dest = basename(uri.pathname)
  }
  const pkg = url.toLowerCase().startsWith('https:') ? https : http

  return new Promise((resolve, reject) => {
    const request = pkg.get(uri.href).on('response', (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest, { flags: 'wx' })
        res
          .on('error', (err) => {
            file.destroy()
            fs.unlink(dest, () => reject(err))
          })
          .pipe(file)
        file
          .on('error', (err) => {
            file.destroy()
            fs.unlink(dest, () => reject(err))
          })
          .on('finish', () => resolve())
      } else if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, dest).then(() => resolve())
      } else {
        reject(new Error(`Download request failed, response status: ${res.statusCode} ${res.statusMessage}`))
      }
    }).end()
    request.setTimeout(TIMEOUT, function () {
      request.abort()
      reject(new Error(`Request timed out`))
    })
  })
}

module.exports = download
