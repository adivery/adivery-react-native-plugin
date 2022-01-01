import {
  NativeEventEmitter,
  EmitterSubscription,
} from 'react-native';
import { NativeModules } from 'react-native';
import AdiveryBanner from './adivery-banner-ad-view';
const { AdiveryModule } = NativeModules

type NativeAd = {
  id: string,
  headline: string,
  description: string,
  advertiser: string,
  call_to_action : string,
  icon: string,
  image: string,
}

class AdiveryImpl {

  _onRewardedLoadedSubscription? : EmitterSubscription
  _onRewardedShownSubscription? : EmitterSubscription
  _onRewardedClickSubscription? : EmitterSubscription
  _onRewardedCloseSubscription? : EmitterSubscription
  _onInterstitialLoadedSubscription? : EmitterSubscription
  _onInterstitialShownSubscription? : EmitterSubscription
  _onInterstitialClickSubsctiption? : EmitterSubscription
  _onInterstitialCloseSubscription? : EmitterSubscription
  _onAppOpenLoadedSubscription? : EmitterSubscription
  _onAppOpenShownSubscription? : EmitterSubscription
  _onAppOpenClickSubscription? : EmitterSubscription
  _onAppOpenCloseSubscription? : EmitterSubscription
  _onErrorSubscription? : EmitterSubscription

  _onRewardedAdLoaded? : (placementId: string) => void
  _onRewardedAdShown? : (placementId: string) => void
  _onRewardedAdClicked? : (placementId: string) => void
  _onRewardedAdClosed? : (placementId: string, isRewarded: boolean) => void
  _onInterstitialAdLoaded? : (placementId: string) => void
  _onInterstitialAdShown? : (placementId: string) => void
  _onInterstitialAdClicked? : (placementId: string) => void
  _onInterstitialAdClosed? : (placementId: string) => void
  _onAppOpenAdloaded? : (placementId: string) => void
  _onAppOpenAdShown? : (placementId: string) => void
  _onAppOpenAdClicked? : (placementId: string) => void
  _onAppOpenAdClosed? : (placementId: string) => void
  _onError? : (placementId: string, message: string) => void

  REWARD_LOADED_EVENT_NAME = "AdiveryRewardedLoaded"
  REWARD_SHOWN_EVENT_NAME = "AdiveryRewardedShown"
  REWARD_CLICKED_EVENT_NAME = "AdiveryRewardedClick"
  REWARD_CLOSED_EVENT_NAME = "AdiveryRewardedClosed"
  INTERSTITIAL_LOADED_EVENT_NAME = "AdiveryInterstitialLoaded"
  INTERSTITIAL_SHOWN_EVENT_NAME = "AdiveryInterstitialShown"
  INTERSTITIAL_CLICKED_EVENT_NAME = "AdiveryInterstitialClick"
  INTERSTITIAL_CLOSED_EVENT_NAME = "AdiveryInterstitialClosed"
  APP_OPEN_LOADED_EVENT_NAME = "AdiveryAppOpenLoaded"
  APP_OPEN_SHOWN_EVENT_NAME = "AdiveryAppOpenShown"
  APP_OPEN_CLICKED_EVENT_NAME = "AdiveryAppOpenClick"
  APP_OPEN_CLOSED_EVENT_NAME = "AdiveryAppOpenClosed"
  ON_ERROR_EVENT_NAME = "AdiveryOnError"

  configure(appId: string){
    AdiveryModule.configure(appId)
    this.configureEventEmitter()
  }
  configureEventEmitter(){
    const eventEmmiter = new NativeEventEmitter(NativeModules.Adivery)
    this._onRewardedLoadedSubscription = eventEmmiter.addListener(this.REWARD_LOADED_EVENT_NAME, (event) => {
      if (this._onRewardedAdLoaded){
        this._onRewardedAdLoaded(event.placementId)
      }
    })
    this._onRewardedShownSubscription = eventEmmiter.addListener(this.REWARD_SHOWN_EVENT_NAME, (event) => {
      if (this._onRewardedAdShown){
        this._onRewardedAdShown(event.placementId)
      }
    })
    this._onRewardedClickSubscription = eventEmmiter.addListener(this.REWARD_CLICKED_EVENT_NAME, (event) => {
      if (this._onRewardedAdClicked){
        this._onRewardedAdClicked(event.placementId)
      }
    })
    this._onRewardedCloseSubscription = eventEmmiter.addListener(this.REWARD_CLOSED_EVENT_NAME, (event) => {
      if (this._onRewardedAdClosed){
        this._onRewardedAdClosed(event.placementId, event.isRewarded)
      }
    })
    this._onInterstitialLoadedSubscription = eventEmmiter.addListener(this.INTERSTITIAL_LOADED_EVENT_NAME, (event) => {
      if (this._onInterstitialAdLoaded){
        this._onInterstitialAdLoaded(event.placementId)
      }
    })
    this._onInterstitialShownSubscription = eventEmmiter.addListener(this.INTERSTITIAL_SHOWN_EVENT_NAME, (event) => {
      if (this._onInterstitialAdShown){
        this._onInterstitialAdShown(event.placementId)
      }
    })
    this._onInterstitialClickSubsctiption = eventEmmiter.addListener(this.INTERSTITIAL_CLICKED_EVENT_NAME, (event) => {
      if (this._onInterstitialAdClicked){
        this._onInterstitialAdClicked(event.placementId)
      }
    })
    this._onInterstitialCloseSubscription = eventEmmiter.addListener(this.INTERSTITIAL_CLOSED_EVENT_NAME, (event) => {
      if (this._onInterstitialAdClosed){
        this._onInterstitialAdClosed(event.placementId)
      }
    })
    this._onAppOpenLoadedSubscription = eventEmmiter.addListener(this.APP_OPEN_LOADED_EVENT_NAME, (event) => {
      if (this._onAppOpenAdloaded){
        this._onAppOpenAdloaded(event.placementId)
      }
    })
    this._onAppOpenShownSubscription = eventEmmiter.addListener(this.APP_OPEN_SHOWN_EVENT_NAME, (event) => {
      if (this._onAppOpenAdShown){
        this._onAppOpenAdShown(event.placementId)
      }
    })
    this._onAppOpenClickSubscription  = eventEmmiter.addListener(this.APP_OPEN_CLICKED_EVENT_NAME, (event) => {
      if (this._onAppOpenAdClicked){
        this._onAppOpenAdClicked(event.placementId)
      }
    })
    this._onAppOpenCloseSubscription = eventEmmiter.addListener(this.APP_OPEN_CLOSED_EVENT_NAME, (event) => {
      if (this._onAppOpenAdClosed){
        this._onAppOpenAdClosed(event.placementId)
      }
    })

    this._onErrorSubscription = eventEmmiter.addListener(this.ON_ERROR_EVENT_NAME, (event) => {
      if (this._onError){
        this._onError(event.placementId, event.message)
      }
    })
  }
  prepareRewardedAd(placementId: string){
    AdiveryModule.prepareRewardedAd(placementId)
  }
  prepareInterstitialAd(placementId: string){
    AdiveryModule.prepareInterstitialAd(placementId)
  }
  prepareAppOpenAd(placementId: string){
    AdiveryModule.prepareAppOpenAd(placementId)
  }
  async isLoaded(placementId: string) {
    const isLoaded =  await AdiveryModule.isLoaded(placementId)
    return isLoaded
  }
  setUserId(userId: string){
    AdiveryModule.setUserId(userId)
  }
  showAd(placementId: string) {
    AdiveryModule.showAd(placementId)
  }
  showAppOpenAd(placementId: string){
    AdiveryModule.showAppOpenAd(placementId)
  }
  async requestNativeAd(placementId: string) : Promise<NativeAd> {
    const nativeAd = await AdiveryModule.requestNativeAd(placementId)
    return nativeAd
  }
  recordNativeAdImpression(ad: NativeAd){
    AdiveryModule.recordNativeAdImpression(ad.id)
  }
  recordNativeAdClick(ad: NativeAd){
    AdiveryModule.recordNativeAdClick(ad.id)
  }
  addGlobalListener(
    {
      onRewardedAdLoaded = (_: string) => {},
      onRewardedAdShown = (_: string) => {},
      onRewardedAdClosed = (_: string, __: boolean) => {},
      onRewardedAdClicked = (_: string) => {},
      onInterstitialAdLoaded = (_: string) => {},
      onInterstitialAdShown = (_: string) => {},
      onInterstitialAdClicked = (_: string) => {},
      onInterstitialAdClosed = (_: string) => {},
      onAppOpenAdLoaded = (_: string) => {},
      onAppOpenAdShown = (_: string) => {},
      onAppOpenAdClicked = (_: string) => {},
      onAppOpenAdClosed = (_: string) => {},
      onError = (_: string, __: string) => {}
    }){
      this._onError = onError
      
      this._onRewardedAdLoaded = onRewardedAdLoaded
      this._onRewardedAdClosed = onRewardedAdClosed
      this._onRewardedAdClicked = onRewardedAdClicked
      this._onRewardedAdShown = onRewardedAdShown

      this._onInterstitialAdClosed = onInterstitialAdClosed
      this._onInterstitialAdClicked = onInterstitialAdClicked
      this._onInterstitialAdLoaded = onInterstitialAdLoaded
      this._onInterstitialAdShown = onInterstitialAdShown

      this._onAppOpenAdloaded = onAppOpenAdLoaded
      this._onAppOpenAdClicked = onAppOpenAdClicked
      this._onAppOpenAdShown = onAppOpenAdShown
      this._onAppOpenAdClosed = onAppOpenAdClosed
    }

    destroy(){
      this._onErrorSubscription?.remove()
      
      this._onInterstitialClickSubsctiption?.remove()
      this._onInterstitialCloseSubscription?.remove()
      this._onInterstitialLoadedSubscription?.remove()
      this._onInterstitialShownSubscription?.remove()

      this._onRewardedClickSubscription?.remove()
      this._onRewardedLoadedSubscription?.remove()
      this._onRewardedShownSubscription?.remove()
      this._onRewardedCloseSubscription?.remove()

      this._onAppOpenClickSubscription?.remove()
      this._onAppOpenCloseSubscription?.remove()
      this._onAppOpenLoadedSubscription?.remove()
      this._onAppOpenShownSubscription?.remove()
    }
}


const Banner = 0;

const SmartBanner = 1;

const LargeBanner = 2;

const MediumRectangle = 3;

const Adivery = new AdiveryImpl()

export { AdiveryBanner, Adivery, Banner, SmartBanner, LargeBanner, MediumRectangle, NativeAd }
