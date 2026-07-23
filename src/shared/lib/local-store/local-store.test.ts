import { localStore } from './local-store';

/**
 * In-memory stand-in for the expo-file-system OOP API. `File`/`Directory` are
 * real classes backed by a shared `registry` keyed by URI, so the adapter's
 * `file.exists` / `text` / `write` / `delete` round-trip through actual stored
 * content. Mirrors the reference mock in `recording-files.test.ts`.
 */
jest.mock('expo-file-system', () => {
  const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
  const join = (base: string, name: string) => `${stripTrailingSlash(base)}/${name}`;

  const registry = new Map<string, string>();

  class Directory {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      const baseUri = typeof base === 'string' ? base : base.uri;
      this.uri = name === undefined ? stripTrailingSlash(baseUri) : join(baseUri, name);
    }
    create() {}
  }

  class File {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      const baseUri = typeof base === 'string' ? base : base.uri;
      this.uri = name === undefined ? baseUri : join(baseUri, name);
    }
    get exists() {
      return registry.has(this.uri);
    }
    create() {
      if (!registry.has(this.uri)) registry.set(this.uri, '');
    }
    write(content: string) {
      registry.set(this.uri, content);
    }
    async text() {
      return registry.get(this.uri) ?? '';
    }
    delete() {
      registry.delete(this.uri);
    }
  }

  return {
    Directory,
    File,
    Paths: { document: 'file:///doc' },
    __registry: registry,
  };
});

const fileSystem = jest.requireMock('expo-file-system') as {
  __registry: Map<string, string>;
};

beforeEach(() => {
  fileSystem.__registry.clear();
});

describe('localStore', () => {
  it('returns null for a key that was never written', async () => {
    expect(await localStore.getItem('snaply.clips')).toBeNull();
  });

  it('round-trips a JSON string through setItem and getItem', async () => {
    const value = JSON.stringify({ clips: [{ id: 'clip-1', durationSec: 3 }] });

    await localStore.setItem('snaply.clips', value);

    expect(await localStore.getItem('snaply.clips')).toBe(value);
  });

  it('overwrites a previously written value', async () => {
    await localStore.setItem('snaply.rolls', '{"rolls":[]}');
    await localStore.setItem('snaply.rolls', '{"rolls":[{"id":"daily-2026-07-23"}]}');

    expect(await localStore.getItem('snaply.rolls')).toBe('{"rolls":[{"id":"daily-2026-07-23"}]}');
  });

  it('removes a stored value', async () => {
    await localStore.setItem('snaply.clips', '{"clips":[]}');

    await localStore.removeItem('snaply.clips');

    expect(await localStore.getItem('snaply.clips')).toBeNull();
  });

  it('keeps values written under different keys independent', async () => {
    await localStore.setItem('snaply.clips', 'clips-value');
    await localStore.setItem('snaply.rolls', 'rolls-value');

    expect(await localStore.getItem('snaply.clips')).toBe('clips-value');
    expect(await localStore.getItem('snaply.rolls')).toBe('rolls-value');
  });
});
