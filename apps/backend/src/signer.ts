export type CloudFrontCookies = { [key: string]: string };

export type SignerOptions = {
	resource: string;
	keyPairId: string;
	dateLessThan: number;
	privateKey: ArrayBuffer | Uint8Array | string;
};

export const getSignedCookie = async ({
	resource,
	keyPairId,
	dateLessThan,
	privateKey,
}: SignerOptions): Promise<CloudFrontCookies> => {
	const policy = {
		Statement: {
			Resource: resource,
			Condition: {
				DateLessThan: {
					'AWS:EpochTime': dateLessThan,
				},
			},
		},
	};

	const policyString = JSON.stringify(policy);
	const encoder = new TextEncoder();
	const policyData = encoder.encode(policyString);

	const key = await crypto.subtle.importKey(
		'pkcs8',
		typeof privateKey === 'string'
			? await pemToArrayBuffer(privateKey)
			: privateKey,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		policyData
	);

	const policyBase64 = toUrlSafeBase64(btoa(policyString));

	return {
		'CloudFront-Key-Pair-Id': keyPairId,
		'CloudFront-Policy': policyBase64,
		'CloudFront-Signature': toUrlSafeBase64(
			btoa(String.fromCharCode(...new Uint8Array(signature)))
		),
	};
};

const toUrlSafeBase64 = (base64: string): string => {
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
	const pemHeader = '-----BEGIN PRIVATE KEY-----';
	const pemFooter = '-----END PRIVATE KEY-----';
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
