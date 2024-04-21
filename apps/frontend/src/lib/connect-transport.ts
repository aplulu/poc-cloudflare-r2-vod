import { Interceptor } from '@bufbuild/connect';
import { createConnectTransport } from '@bufbuild/connect-web';

export const createTransport = (interceptors: Interceptor[] = []) => {
  return createConnectTransport({
    baseUrl: import.meta.env.VITE_API_ENDPOINT_URL || '',
    useBinaryFormat: true,
    useHttpGet: true,
    credentials: 'same-origin',
    interceptors,
  });
};
