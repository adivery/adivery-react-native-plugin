import { Adivery, NativeAd } from 'adivery';
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
  useEffect(() => {
    if (nativeAd) {
      return;
    }
    Adivery.requestNativeAd(placementId).then((nativeAd) => {
      setNativeAd(nativeAd);
    });
  }, [nativeAd]);
  if (nativeAd) {
    Adivery.recordNativeAdImpression(nativeAd);
    return <View>{child(nativeAd)}</View>;
  }
  return fallback;
};

export default AdiveryNativeAd;
