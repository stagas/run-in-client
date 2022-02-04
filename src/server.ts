import https from 'https'
import fs from 'fs/promises'
import makeCert from 'make-cert'
import path from 'path'
import mime from 'mime-types'
import getPort from 'find-free-ports'
import { buildSync } from 'esbuild'
import type { AddressInfo } from 'net'

const keys = makeCert('localhost')

interface ContentResponse {
  type: string
  content: string
}

export interface ServerSetup {
  errorHook: (error: Error) => void
  root: string
  inject?: string
  buildOptions?: Parameters<typeof buildSync>[0]
}

export const createServer = async (setup: ServerSetup) => {
  const responses: Record<string, ContentResponse> = {}

  const server = https.createServer(keys, async (req, res) => {
    try {
      req.url = req.url!

      const [url] = req.url.split('?')

      if (url in responses) {
        const content = responses[req.url]
        res.setHeader('Content-Type', content.type)
        res.end(content.content)
        return
      }

      let filename = path.resolve(path.join(setup.root, url))
      let contents: string

      if (filename.endsWith('.ts')) {
        const result = buildSync({
          entryPoints: [filename],
          format: 'esm',
          sourcemap: 'inline',
          logLevel: 'silent',
          keepNames: true,
          bundle: true,
          write: false,
          ...setup.buildOptions,
        })
        const [file] = result.outputFiles || []
        if (!file) throw new TypeError('Build failed, no output files')
        contents = Buffer.from(file.contents).toString('utf8')
        filename = filename.replace('.ts', '.js')
      } else {
        contents = await fs.readFile(filename, 'utf8')
      }
      const contentType = mime.contentType(path.basename(filename))
      res.setHeader('Content-Type', contentType || 'application/octet-stream')
      res.end((setup.inject ?? '') + contents)
    } catch (error) {
      // console.log(error)
      res.statusCode = 400
      res.end()
      setup.errorHook(error as Error)
      return
    }
  })

  const host = 'localhost'
  const [port] = await getPort()
  await new Promise<void>(resolve => server.listen(port, host, resolve))

  const close = () => new Promise(resolve => server.close(resolve))

  const addressInfo = server.address() as AddressInfo
  const url = `https://${addressInfo.address}:${addressInfo.port}`

  return {
    url,
    server,
    responses,
    close,
  }
}
