import { Adivery } from './index';
import type { NativeAd } from './index';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { ReactElement } from 'react';

type Props = {
  placementId: string;
  child: (ad: NativeAd) => ReactElement;
  fallback: ReactElement;
};

const AdiveryNativeAd = ({ placementId, child, fallback }: Props) => {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  // Load an ad for the placement, and again whenever the placement changes.
  useEffect(() => {
    let active = true;
    setNativeAd(null);
    Adivery.requestNativeAd(placementId)
      .then((ad) => {
        if (active) {
          setNativeAd(ad);
        }
      })
      .catch(() => {
        // No ad: keep showing the fallback.
      });
    return () => {
      active = false;
    };
  }, [placementId]);

  // One impression per ad, not one per render.
  useEffect(() => {
    if (nativeAd) {
      Adivery.recordNativeAdImpression(nativeAd);
    }
  }, [nativeAd]);

  if (nativeAd) {
    return <View>{child(nativeAd)}</View>;
  }
  return fallback;
};

export default AdiveryNativeAd;
