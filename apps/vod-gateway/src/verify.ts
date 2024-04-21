import { z } from 'zod';

export class VerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerifyError';
  }
}

const policySchema = z.object({
  Statement: z.object({
    Resource: z.string(),
    Condition: z.object({
      DateLessThan: z.object({
        'AWS:EpochTime': z.number(),
      }),
    }),
  }),
});

export const verifyCookie = async (
  cookie: string,
  requestURL: string,
  publicKey: string
) => {
  const cookieMap = new Map<string, string>();
  cookie.split(';').forEach((pair) => {
    const pairs = pair.split('=');
    if (pairs.length === 2) {
      cookieMap.set(pairs[0].trim(), pairs[1].trim());
    }
  });

  const signature = cookieMap.get('CloudFront-Signature');
  if (!signature) {
    throw new VerifyError('Signature not found');
  }

  const policy = cookieMap.get('CloudFront-Policy');
  if (!policy) {
    throw new VerifyError('Policy not found');
  }

  const keyPairId = cookieMap.get('CloudFront-Key-Pair-Id');
  if (!keyPairId) {
    throw new VerifyError('Key-Pair-Id not found');
  }

  const key = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const policyData = atob(fromUrlSafeBase64(policy));
  const signatureData = Uint8Array.from(
    atob(fromUrlSafeBase64(signature)),
    (c) => c.charCodeAt(0)
  );

  const encoder = new TextEncoder();

  const isValid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    signatureData,
    encoder.encode(policyData)
  );
  if (!isValid) {
    throw new VerifyError('Invalid signature');
  }

  const policyObject = policySchema.safeParse(JSON.parse(policyData));
  if (!policyObject.success) {
    throw new VerifyError('Invalid policy');
  }

  // Wildcardが含まれている場合はrequestURLとの部分一致を許可する
  if (policyObject.data.Statement.Resource.includes('*')) {
    const resource = policyObject.data.Statement.Resource.replace(/\*/g, '.*');
    const resourceRegex = new RegExp(`^${resource}$`);
    if (!resourceRegex.test(requestURL)) {
      throw new VerifyError('Resource does not match');
    }
  } else if (policyObject.data.Statement.Resource !== requestURL) {
    throw new VerifyError('Resource does not match');
  }

  // 有効期限を確認
  const dateLessThan =
    policyObject.data.Statement.Condition.DateLessThan['AWS:EpochTime'];
  const now = Math.floor(Date.now() / 1000);
  if (dateLessThan < now) {
    throw new VerifyError('Policy expired');
  }
};

const fromUrlSafeBase64 = (base64: string): string => {
  const b = base64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b.length % 4;
  return b + '='.repeat(pad);
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length
  );
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return binaryDer.buffer;
};
