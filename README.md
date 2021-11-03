# adivery

Simple plugin to display adivery ads in react-native android applications.

## Installation

```sh
npm install adivery
```

## Usage

```js
import { Adivery, AdiveryBanner, Banner, LargeBanner, MediumRectangle } from "adivery";

// declare your placementIds

// these are test placements , replace with your own
const appOpenPlacement = "9e9dd375-a1fe-4c2b-8432-b5bf8a5095f6"
const rewardedPlacement = "3f97dc4d-3e09-4024-acaf-931862c03ba8"
const interstitialPlacement = "0045a4aa-1498-4790-9eed-6e33ac870e5f"
const adiveryAppId = "7e27fb38-5aff-473a-998f-437b89426f66"
const bannerPlacementId = "2f71ec44-f30a-4043-9cc1-f32347a07f8b"
const nativePlacementId = "25928bf1-d4f7-432c-aaf7-1780602796c3"

// initialize Adivery
Adivery.configure(adiveryAppId)
```

### Display rewarded Ad

To display a rewarded ad first you need to prepare rewarded ad. this makes SDK to prepare rewarded ad and handle reloading it later.

```
Adivery.prepareRewardedAd(rewardedPlacement)
```

To show rewarded ad to user use the following code.

```
Adivery.isLoaded(rewardedPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(rewardedPlacement)
      }
    })
```

### Display interstitial Ad

To display a interstitial ad first you need to prepare rewarded ad. this makes SDK to prepare interstitial ad and handle reloading it later.

```
Adivery.prepareInterstitialAd(interstitialPlacement)
```

To show rewarded ad to user use the following code.

```
Adivery.isLoaded(interstitialPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(interstitialPlacement)
      }
    })
```

### Display app-open Ad

To display a app-open ad first you need to prepare rewarded ad. this makes SDK to prepare app-open ad and handle reloading it later.

```
Adivery.prepareAppOpenAd(appOpenPlacement)
```

To show rewarded ad to user use the following code.

```
Adivery.isLoaded(appOpenPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(appOpenPlacement)
      }
    })
```

### Add Callback for fullscreen Ads.

If you want to get notified when a ad is loaded or user clicked on add you can use the following code

```
Adivery.addGlobalListener(
      {
        onRewardedAdLoaded: (placementId) => {
          console.log("rewarded loaded")
        },
        onRewardedAdShown: (placementId) => {
          console.log("rewarded shown")
        },
        onRewardedAdClicked: (placementId) => {
          console.log("rewarded clicked")
        },
        onRewardedAdClosed: (plcementId, isRewarded) => {
          console.log("rewarded closed: " + isRewarded)
        },
        onInterstitialAdLoaded: (placementId) => {
          console.log("interstitial loaded")
        },
        onInterstitialAdShown: (placementId) => {
          console.log("insterstitial shown")
        },
        onInterstitialAdClicked: (placementId) => {
          console.log("interstitial clicked")
        },
        onInterstitialAdClosed: (placementId) => {
          console.log("interstitial closed")
        },
        onAppOpenAdLoaded: (placementId) => {
          console.log("appOpen loaded")
        },
        onAppOpenAdShown: (placenentId) => {
          console.log("appOpen shown")
        },
        onAppOpenAdClicked: (placementId) => {
          console.log("appOpen clicked")
        },
        onAppOpenAdClosed: (placementId) => {
          console.log("appOpen closed")
        },
        onError: (placementId, message) => {
          console.log("onError: " + message)
        }
      }
    )
```

### Display banner Ad.

To display a banner ad just simply add this code to your render function.

```
<AdiveryBanner 
    style={{width:this.state.w, height:this.state.h}} 
    placementId={bannerPlacementId} 
    bannerSize={this.state.bannerSize} 
    onAdLoaded={this.bannerLoaded} 
    onAdClicked={this.bannerClicked} 
    onError={this.bannerError} />
```
