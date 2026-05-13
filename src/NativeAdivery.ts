import type {TurboModule} from 'react-native/Libraries/TurboModule/RCTExport';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  configure(appId: string): void;
  setUserId(userId: string): void;
  prepareRewardedAd(placementId: string): void;
  prepareInterstitialAd(placementId: string): void;
  prepareAppOpenAd(placementId: string): void;
  isLoaded(placementId: string): Promise<boolean>;
  showAd(placementId: string): void;
  showAppOpenAd(placementId: string): void;
  requestNativeAd(placementId: string): Promise<Object>;
  recordNativeAdImpression(id: string): void;
  recordNativeAdClick(id: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AdiveryModule');
