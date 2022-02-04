import puppeteer from 'puppeteer'
import pretty from 'puppeteer-pretty-console'
import { createServer } from './server'

import type { ServerSetup } from './server'

export interface ClientSetup extends Partial<ServerSetup> {
  include?: string
  launchOptions?: Parameters<typeof puppeteer.launch>[0]
}

/**
 * Creates a static server with esbuild transforms, creates a puppeteer instance,
 * executes a single function, returns its result and tears down.
 *
 * ```ts
 * const setup = {
 *   root: path.resolve(path.join(__dirname, '..')),
 *   include: `
 *     import { someModule } from './some-module.ts' // note we can import .ts files
 *     window.someModule = someModule
 *   `,
 * }
 *
 * // this is how our function below gets intellisense
 * declare window: WindowOrWorkerGlobalScope & { someModule: typeof someModule }
 *
 * // the function runs in the client, as such doesn't have access to the scope!
 * const result = await runInClient(setup, async () => {
 *   const output = await window.someModule.doSomething()
 *   return output
 * })
 * // => `result` is now `output`
 * ```
 *
 * @param setup A setup object
 * @param setup.root The static root directory to serve and esbuild transform files from
 * @param setup.include JavaScript to run before the function, like import statements
 * @param setup.buildOptions Esbuild build options (@see https://esbuild.github.io/api/#build-api)
 * @param setup.launchOptions Puppeteer launch options (@see https://puppeteer.github.io/puppeteer/docs/puppeteer.launch/)
 * @param fn The function to run. This will be passed in `page.evaluate(fn)`
 * @returns The result value of `page.evaluate(fn)`
 */
export const runInClient = async (setup: ClientSetup, fn: () => unknown) => {
  let errorHook!: () => void
  const errorPromise = new Promise<void>((_, reject) => (errorHook = reject))

  const server = await createServer({ ...setup, root: setup.root ?? process.cwd(), errorHook })

  setup.launchOptions ??= {}
  setup.launchOptions.args ??= []
  setup.launchOptions.args = [...new Set([...setup.launchOptions.args, '--ignore-certificate-errors'])]
  const browser = await puppeteer.launch(setup.launchOptions)

  const close = async () => {
    // wait for console to flush
    await new Promise(resolve => setTimeout(resolve, 20))

    await browser.close()
    await server.close()
  }

  const result = await Promise.race([
    errorPromise,
    (async () => {
      let resolveReady: () => void
      const readyPromise = new Promise<void>(resolve => (resolveReady = resolve))
      const page = await browser.newPage()
      pretty(page)
      await page.exposeFunction('ready', () => resolveReady())
      server.responses['/'] = { type: 'text/html', content: '<script type="module" src="client.js"></script>' }
      server.responses['/client.js'] = { type: 'application/javascript', content: (setup.include ?? '') + ';ready()' }
      await page.goto(server.url + '/', { timeout: 1000 })
      await readyPromise
      const result = await page.evaluate(fn)
      await close()
      return result
    })(),
  ]).catch(async error => {
    await close()
    throw error
  })

  return result
}

export default runInClient
