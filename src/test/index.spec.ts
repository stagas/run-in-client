/* eslint-disable @typescript-eslint/no-explicit-any */
import { runInClient } from '../'
import path from 'path'

describe('runInClient', () => {
  it('works', async () => {
    const result = await runInClient({}, () => 'hello world')
    expect(result).toEqual('hello world')
  })

  it('include', async () => {
    const result = await runInClient(
      {
        include: `window.foo = 'foo'`,
      },
      () => (window as any).foo
    )
    expect(result).toEqual('foo')
  })

  it('root', async () => {
    const result = await runInClient(
      {
        root: path.resolve(path.join(__dirname, 'fixture')),
        include: `import { foo } from './foo.ts'; window.foo = foo`,
      },
      () => (window as any).foo
    )
    expect(result).toEqual('foo')
  })

  it('server ignores query parameters', async () => {
    const result = await runInClient(
      {
        root: path.resolve(path.join(__dirname, 'fixture')),
        include: `import { query } from './query.ts?some-query'; window.query = query`,
      },
      () => (window as any).query
    )
    expect(result).toEqual('some-query')
  })

  it('errors', async () => {
    await expect(
      runInClient({}, () => {
        throw new Error('problem')
      })
    ).rejects.toThrow('problem')
  })

  it('errors on filename', async () => {
    await expect(
      runInClient(
        {
          root: path.resolve(path.join(__dirname, 'fixture')),
          include: `import './non-existant.ts'`,
        },
        () => {
          throw new Error('problem')
        }
      )
    ).rejects.toThrow('Build failed')
  })

  it('errors on network errors', async () => {
    await expect(
      runInClient(
        {
          root: path.resolve(path.join(__dirname, 'fixture')),
        },
        () => {
          fetch('./non-existant')
        }
      )
    ).rejects.toThrow('no such file')
  })
})
