import { useMemo } from 'react';
import { createPromiseClient } from '@bufbuild/connect';
import { ServiceType } from '@bufbuild/protobuf';

import { createTransport } from '@/lib/connect-transport';

export const usePublicConnectClient = <T extends ServiceType>(service: T) => {
  const transport = createTransport();

  return useMemo(() => {
    return createPromiseClient(service, transport);
  }, [service, transport]);
};
