<h1 align="center">run-in-client</h1>

<p align="center">
runs a single function in the client using puppeteer and esbuild
</p>

<p align="center">
   <a href="#install">        🔧 <strong>Install</strong></a>
 · <a href="#example">        🧩 <strong>Example</strong></a>
 · <a href="#api">            📜 <strong>API docs</strong></a>
 · <a href="https://github.com/stagas/run-in-client/releases"> 🔥 <strong>Releases</strong></a>
 · <a href="#contribute">     💪🏼 <strong>Contribute</strong></a>
 · <a href="https://github.com/stagas/run-in-client/issues">   🖐️ <strong>Help</strong></a>
</p>

***

## Install

```sh
$ npm i run-in-client
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [runInClient](#runinclient)
    *   [Parameters](#parameters)

### runInClient

[src/index.ts:44-82](https://github.com/stagas/run-in-client/blob/be4ecefe8f9e6f38caf1d08c993c5b228e484b8b/src/index.ts#L44-L82 "Source code on GitHub")

Creates a static server with esbuild transforms, creates a puppeteer instance,
executes a single function, returns its result and tears down.

```ts
const setup = {
  root: path.resolve(path.join(__dirname, '..')),
  include: `
    import { someModule } from './some-module.ts' // note we can import .ts files
    window.someModule = someModule
  `,
}

// this is how our function below gets intellisense
declare window: WindowOrWorkerGlobalScope & { someModule: typeof someModule }

// the function runs in the client, as such doesn't have access to the scope!
const result = await runInClient(setup, async () => {
  const output = await window.someModule.doSomething()
  return output
})
// => `result` is now `output`
```

#### Parameters

*   `setup` **ClientSetup** A setup object

    *   `setup.root`  The static root directory to serve and esbuild transform files from
    *   `setup.include`  JavaScript to run before the function, like import statements
    *   `setup.buildOptions`  Esbuild build options (@see <https://esbuild.github.io/api/#build-api>)
    *   `setup.launchOptions`  Puppeteer launch options (@see <https://puppeteer.github.io/puppeteer/docs/puppeteer.launch/>)
*   `fn` **function (): any** The function to run. This will be passed in `page.evaluate(fn)`

Returns **any** The result value of `page.evaluate(fn)`

## Contribute

[Fork](https://github.com/stagas/run-in-client/fork) or
[edit](https://github.dev/stagas/run-in-client) and submit a PR.

All contributions are welcome!

## License

MIT © 2021
[stagas](https://github.com/stagas)
