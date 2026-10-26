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
const appOpenPlacement = "c0b3bf0e-75a5-4183-ad86-2cc5c07c07d6"
const rewardedPlacement = "29f509a9-3826-4ada-8404-4735aa14b510"
const interstitialPlacement = "5788d25b-b7d6-442c-a562-b4bef582c18c"
const adiveryAppId = "738c5e66-2e4f-4ff0-8118-ef6c8235a5e9"
const bannerPlacementId = "06f0c520-3cc8-45c0-bbf1-f866f7eac525"
const nativePlacementId = "9bc87b9f-3aef-4988-b1d2-2f4e5b67b2c5"

// initialize Adivery
Adivery.configure(adiveryAppId)
```

### Display rewarded Ad

To display a rewarded ad first you need to prepare rewarded ad. this makes SDK to prepare rewarded ad and handle reloading it later.

```js
Adivery.prepareRewardedAd(rewardedPlacement)
```

To show rewarded ad to user use the following code.

```js
Adivery.isLoaded(rewardedPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(rewardedPlacement)
      }
    })
```

### Display interstitial Ad

To display a interstitial ad first you need to prepare rewarded ad. this makes SDK to prepare interstitial ad and handle reloading it later.

```js
Adivery.prepareInterstitialAd(interstitialPlacement)
```

To show rewarded ad to user use the following code.

```js
Adivery.isLoaded(interstitialPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(interstitialPlacement)
      }
    })
```

### Display app-open Ad

To display a app-open ad first you need to prepare rewarded ad. this makes SDK to prepare app-open ad and handle reloading it later.

```js
Adivery.prepareAppOpenAd(appOpenPlacement)
```

To show rewarded ad to user use the following code.

```js
Adivery.isLoaded(appOpenPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(appOpenPlacement)
      }
    })
```

### Display OfferWall Ad

OfferWall needs Adivery SDK 4.10.0-alpha.1 or later (this plugin version pins it).

To display an offer wall ad, first prepare it:

```js
Adivery.prepareOfferWallAd(offerWallPlacement)
```

Once `onOfferWallAdLoaded` fires (see the callbacks below), show it:

```js
Adivery.showAd(offerWallPlacement)
```

Unlike interstitial and rewarded ads, the SDK doesn't prepare another offer wall
after one closes. Call `prepareOfferWallAd` again before each show. The example
app prepares on tap and shows from `onOfferWallAdLoaded`:

```js
Adivery.addGlobalListener({
  onOfferWallAdLoaded: (placementId) => {
    Adivery.showAd(placementId)
  },
})

// on tap:
Adivery.prepareOfferWallAd(offerWallPlacement)
```

### Add Callback for fullscreen Ads.

If you want to get notified when a ad is loaded or user clicked on add you can use the following code

```js
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
        onOfferWallAdLoaded: (placementId) => {
          console.log("offerWall loaded")
        },
        onOfferWallAdShown: (placementId) => {
          console.log("offerWall shown")
        },
        onOfferWallAdClicked: (placementId) => {
          console.log("offerWall clicked")
        },
        onOfferWallAdClosed: (placementId) => {
          console.log("offerWall closed")
        },
        onOfferWallMissionRewarded: (placementId, currency, rewardAmount) => {
          console.log("offerWall rewarded: " + rewardAmount + " " + currency)
        },
        onError: (placementId, message) => {
          console.log("onError: " + message)
        }
      }
    )
```

### Display banner Ad.

To display a banner ad just simply add this code to your render function.

```js
<AdiveryBanner 
    style={{width:this.state.w, height:this.state.h}} 
    placementId={bannerPlacementId} 
    bannerSize={this.state.bannerSize} 
    onAdLoaded={this.bannerLoaded} 
    onAdClicked={this.bannerClicked} 
    onError={this.bannerError} />
```
