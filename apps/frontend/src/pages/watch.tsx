import { VStack } from '@kuma-ui/core';
import useSWR from 'swr';

import { VODService } from '@nyantube/grpc/nyantube/vod/v1';

import { usePublicConnectClient } from '@/hooks/connect';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export const WatchPage = () => {
  const videoId = new URLSearchParams(window.location.search).get('v');

  const vodServiceClient = usePublicConnectClient(VODService);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { data } = useSWR(
    videoId
      ? [VODService.typeName + '/' + VODService.methods.getVideo.name, videoId]
      : null,
    ([_, videoId]) => vodServiceClient.getVideo({ videoId }),
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (!videoRef.current || !data) {
      return;
    }

    // CloudFront用署名付きCookieを設定
    Object.entries(data.cookies).forEach(([key, value]) => {
      document.cookie = `${key}=${value}; path=/; secure; domain=${import.meta.env.VITE_COOKIE_DOMAIN}`;
    });

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        },
      });
      hls.loadSource(data.playlistUrl);
      hls.attachMedia(videoRef.current);
      videoRef.current.play();
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = data.playlistUrl;
      videoRef.current.play();
    }
  }, [data?.playlistUrl, data?.cookies]);

  return (
    <VStack>
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        width={640}
        height={360}
      />
    </VStack>
  );
};
