const justFetch = async (uri) => {
  const { Readable } = await import('stream');
  const r = await globalThis.fetch(uri);
  return Readable.fromWeb(r.body);
};

const wrapGet = ({ get }) => async (uri) => {
  const buffers = [];
  return new Promise((resolve, reject) => get(uri, resolve));
};

async function* dataUriToBuffer({ pathname }) {
  const SZ = 65534;
  const [isBase64, data] = (pathname.match(/^([^,;]+)?(;base64)?,(.*)$/) || []).slice(2);
  if (!data) {
    throw new Error("Malformed data: URL");
  }
  const chunk = isBase64 ? (c) => Buffer.from(c, 'base64') : (c) => Buffer.from(decodeURIComponent(c), 'utf-8');
  let ofs = 0;
  while (ofs < data.length) {
    let ch = data.slice(ofs, ofs + SZ);
    ofs = Math.min(data.length, ofs + SZ);
    while (!isBase64 && (ch[ch.length - 1] === '%' || ch[ch.length - 2] === '%')) {
      ch += data[ofs++];
    }
    yield chunk(ch);
  }
};


const readUserSshConfig = async (uri) => {
  const { default: SSHConfig } = await import('ssh-config');
  const { join } = await import('path');
  const { readFile } = await import('fs/promises');
  const home = process.env.HOME ?? process.env.USERPROFILE;
  const sshConf = join(home, '.ssh', 'config');
  let config = SSHConfig.parse('');
  try {
    config = SSHConfig.parse(await readFile(sshConf, 'utf-8'));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  const CONF_MAP = { HostName: 'host', Port: 'port', User: 'username', IdentityFile: 'privateKey' };
  const clientConfig = {
    port: '22',
  };
  config.find({ Host: uri.hostname }).config.forEach(({ param, value }) => {
    if (CONF_MAP[param]) clientConfig[CONF_MAP[param]] = value;
  });
  if (clientConfig.privateKey) {
    clientConfig.privateKey = await readFile(join('.', clientConfig.privateKey.replace(/%d/g, home)));
  }
  return clientConfig;
}

const HANDLERS = {
  async file(uri) {
    const { createReadStream } = await import('fs');
    const { fileURLToPath } = await import('url');
    return createReadStream(fileURLToPath(uri));
  },
  https: globalThis.fetch ? justFetch : wrapGet(await import('https')),
  http: globalThis.fetch ? justFetch : wrapGet(await import('http')),
  data: globalThis.fetch ? justFetch : dataUriToBuffer,
  async *sftp(uri) {
    const SZ = 65536;
    let client;
    let handle;
    let sftpWrapper;
    try {
      const { Client } = await import('node-scp');
      client = await Client(await readUserSshConfig(uri));
      sftpWrapper = client.sftpWrapper;
      let size = await new Promise((resolve, reject) => {
        sftpWrapper.stat(uri.pathname, (err, stats) => {
          if (err) return reject(err);
          resolve(stats.size);
        });
      })
      handle = await new Promise((resolve, reject) => {
        sftpWrapper.open(uri.pathname, 'r', 0o666, (err, handle) => {
          if (err) return reject(err);
          resolve(handle);
        });
      });
      let read = 0;
      while (read < size) {
        const toRead = Math.min(SZ, size - read);
        const chunk = Buffer.allocUnsafe(toRead);
        await new Promise((resolve, reject) => {
          sftpWrapper.read(handle, chunk, 0, toRead, read, (err, numBytes) => {
            if (err) reject(err);
            read += numBytes;
            resolve();
          });
        });
        yield chunk;
      }
      console.log('done');
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(`To use sftp: URLs, please run \`npm i ssh-config node-scp\`.`);
      }
      throw e;
    } finally {
      if (handle && sftpWrapper) {
        await new Promise((resolve, reject) => {
          sftpWrapper.close(handle, (er) => {
            if (er) console.warn(er);
            resolve();
          });
        });
      }
      if (client) {
        client.close();
      }
    }
  },
};

/**
 * Stream a Buffer from a file:, sftp:, data:, http:, or https: URL
 * @param {string|URL} uri Any URL or URI
 * @param {string|URL|undefined} [origin] If a URI, where it was referenced from.
 * @returns {Buffer} containing the content from the given URI
 */
export async function streamUrl(uri, origin) {
  if (!(uri instanceof URL)) {
    uri = new URL(uri, origin);
  }
  const { protocol } = uri;
  const scheme = protocol.replace(/:$/ ,'');
  if (!HANDLERS[scheme]) {
    throw new Error(`Unsupported protocol: "${protocol}"`);
  }
  return HANDLERS[scheme](uri);
}
