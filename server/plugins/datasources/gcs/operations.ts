import { Storage } from '@google-cloud/storage';
import * as stream from 'stream';

export async function listBuckets(client: Storage, _options: object): Promise<object> {
  return await client.getBuckets();
}

export async function listFiles(client: Storage, options: object): Promise<object> {
  return await client.bucket(options['bucket']).getFiles({ prefix: options['prefix'] });
}

export async function getFile(client: Storage, options: object): Promise<object> {
  // Create a helper function to convert a ReadableStream to a string.
  const streamToString = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

  const data = client.bucket(options['bucket']).file(options['file']).createReadStream();
  // Convert the ReadableStream to a string.
  const bodyContents = await streamToString(data);
  return { ...data, Body: bodyContents };
}

export async function uploadFile(client: Storage, options: object): Promise<object> {
  // Get a reference to the bucket
  const myBucket = client.bucket(options['bucket']);

  // Create a reference to a file object
  const file = myBucket.file(options['file']);

  // Create a pass through stream from a string
  const passthroughStream = new stream.PassThrough();
  passthroughStream.write(options['data']);
  passthroughStream.end();

  const response = passthroughStream.pipe(
    file.createWriteStream({
      metadata: { contentType: options['contentType'] },
    })
  );
  return response;
}

export async function signedUrlForGet(client: Storage, options: object): Promise<object> {
  const defaultExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
  const expiresIn = options['expiresIn'] ? Date.now() + options['expiresIn'] * 1000 : defaultExpiry;

  const [url] = await client.bucket(options['bucket']).file(options['file']).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresIn,
  });

  return { url };
}

export async function signedUrlForPut(client: Storage, options: object): Promise<object> {
  const defaultExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
  const expiresIn = options['expiresIn'] ? Date.now() + options['expiresIn'] * 1000 : defaultExpiry;

  const [url] = await client
    .bucket(options['bucket'])
    .file(options['file'])
    .getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresIn,
      contentType: options['contentType'] || 'application/octet-stream',
    });

  return { url };
}
