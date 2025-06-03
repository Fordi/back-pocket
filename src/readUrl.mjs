const justFetch = (uri) => globalThis.fetch(uri).then(r => r.arrayBuffer()).then(r => Buffer.from(r));

const wrapGet = ({ get }) => (uri) => new Promise((resolve, reject) => {
  const buffers = [];
  get(uri, (response) => {
    response.on('data', (d) => buffers.push(d));
    response.on('error', reject);
    response.on('close', () => resolve(Buffer.concat(buffers)));
  })
});

const dataUriToBuffer = ({ pathname }) => {
  const [isBase64, data] = (pathname.match(/^([^,;]+)?(;base64)?,(.*)$/) || []).slice(2);
  if (!data) {
    throw new Error("Malformed data: URL");
  }
  if (isBase64) {
    return Buffer.from(data, 'base64');
  }
  return Buffer.from(decodeURIComponent(data), 'utf-8')
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
  https: globalThis.fetch ? justFetch : wrapGet(await import('https')),
  http: globalThis.fetch ? justFetch : wrapGet(await import('http')),
  data: globalThis.fetch ? justFetch : dataUriToBuffer,
  async file(uri) {
    const { readFile } = await import('fs/promises');
    const { fileURLToPath } = await import('url');
    return readFile(fileURLToPath(uri));
  },
  async sftp(uri) {
    let client;
    try {
      const { Client } = await import('node-scp');
      client = await Client(await readUserSshConfig(uri));
      const data = await client.readFile(uri.pathname);
      client.close();
      return data;
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(`To use sftp: URLs, please run \`npm i ssh-config node-scp\`.`);
      }
      throw e;
    } finally {
      client?.close?.();
    }
  },
};

/**
 * Get a Buffer from a file:, sftp:, data:, http:, or https: URL
 * @param {string|URL} uri Any URL or URI
 * @param {string|URL|undefined} [origin] If a URI, where it was referenced from.
 * @returns {Buffer} containing the content from the given URI
 */
export async function readUrl(uri, origin) {
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
