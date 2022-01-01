import React, { Component } from 'react';

import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Adivery, AdiveryBanner, Banner, LargeBanner, MediumRectangle, NativeAd } from 'adivery';

const appOpenPlacement = "9e9dd375-a1fe-4c2b-8432-b5bf8a5095f6"
const rewardedPlacement = "3f97dc4d-3e09-4024-acaf-931862c03ba8"
const interstitialPlacement = "0045a4aa-1498-4790-9eed-6e33ac870e5f"
const adiveryAppId = "7e27fb38-5aff-473a-998f-437b89426f66"
const bannerPlacementId = "2f71ec44-f30a-4043-9cc1-f32347a07f8b"
const nativePlacementId = "25928bf1-d4f7-432c-aaf7-1780602796c3"


Adivery.configure(adiveryAppId)
Adivery.setUserId("test")
Adivery.prepareInterstitialAd(interstitialPlacement)
Adivery.prepareRewardedAd(rewardedPlacement)
Adivery.prepareAppOpenAd(appOpenPlacement)

export default class  App extends Component {
  state = {
    bannerSize: Banner,
    w: 320,
    h: 50,
    nativeAds: [],
  }  
  constructor(props){
    super(props)

    this.displayNtiveAd = this.displayNtiveAd.bind(this)

    Adivery.showAppOpenAd(appOpenPlacement)
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
  }

  componentWillUnmount() {
    Adivery.destroy()
  }

  bannerLoaded = function(){
    console.log("banner loaded")
  }

  bannerShown() {
    console.log("banner shown")
  }

  bannerClicked() {
    console.log("banner clicked")
  }

  bannerError(reason) {
    console.log("banner error " + reason)
  }

  btn_press(){
    console.log("btn click")
  }

  showRewarded() {
    Adivery.isLoaded(rewardedPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(rewardedPlacement)
      }
    })
  }

  showInterstitial(){
    Adivery.isLoaded(interstitialPlacement).then((isLoaded) => {
      if ( isLoaded ){
        console.log("calling show")
        Adivery.showAd(interstitialPlacement)
      }
    })
  }

  showBanner = () => {
    this.setState({
      bannerSize: Banner,
      w: 320,
      h: 50
    })
  }

  showLargeBanner = () => {
    this.setState({
      bannerSize: LargeBanner,
      w: 320,
      h: 100
    })
  }

  showMediumRectangle = () => {
    this.setState({
      bannerSize: MediumRectangle,
      w: 300,
      h: 250
    })
  }

  showNative = async () => {
    try {
      const nativeAd = await Adivery.requestNativeAd(nativePlacementId)
      console.log("native ad loaded.")
      Adivery.recordNativeAdImpression(nativeAd)
      this.displayNtiveAd(nativeAd)
    } catch (error){
      console.log(error)
    }
  }

  displayNtiveAd = (nativeAd) => {
    this.setState({
      nativeAds: [...this.state.nativeAds ,nativeAd],
    })
  }

  nativeClick(nativeAd) {
    Adivery.recordNativeAdClick(nativeAd)
  }

  renderNative(nativeAd) {
      if (nativeAd == undefined){
        return (
          <View/>
        )
      }
      return (
        <View style={{backgroundColor: 'blue', padding:10}}>
              <View style={styles.adlayout}>
                <Button title={nativeAd.call_to_action} onPress={() => {this.nativeClick(nativeAd)}} />
                <View>
                  <Text >{nativeAd.headline}</Text>
                  <Text>{nativeAd.description}</Text>
                </View>
                <View>
                  <Image style={{width:50, height: 50}} source={{uri:"data:image/png;base64," + nativeAd.icon}} />
                  <Text>{nativeAd.advertiser}</Text>
                </View>
              </View>
              <Image style={{width: 300, height:200}} source={{uri:"data:image/png;base64," + nativeAd.image}}/>
            </View>
        
      )
  }

  render(){
    return (
      <View style={styles.container}>
        <View style={[,{width:this.state.w, height:this.state.h}]}>
          <AdiveryBanner style={{width:this.state.w, height:this.state.h}} placementId={bannerPlacementId} bannerSize={this.state.bannerSize} 
            onAdLoaded={this.bannerLoaded} onAdShown={this.bannerShown} onAdClicked={this.bannerClicked} onError={this.bannerError} />
        </View>

        <View style={styles.adlayout}>
          <View style={styles.btn}>
           <Button title="rewarded" onPress={this.showRewarded}/>
          </View>
          <View style={styles.btn}>
            <Button title="interstitial" onPress={this.showInterstitial}/>
          </View>
          <View style={styles.btn}>
            <Button title="native" onPress={this.showNative}/>
          </View>
        </View>

        <View style={styles.adlayout} >
          <View style={styles.btn}>
            <Button title="banner" onPress={this.showBanner}/>
          </View>
          <View style={styles.btn}>
            <Button title="large banner" onPress={this.showLargeBanner}/>
          </View>
          <View style={styles.btn}>
            <Button title="medium rectangle" onPress={this.showMediumRectangle}/>
          </View>
        </View>

        {
          this.renderNative(this.state.nativeAds[0])
        }

        {
          this.renderNative(this.state.nativeAds[1])
        }
      </View>
    );
  }
  
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  btn: {
    margin: 4
  },
  adlayout: {
    flexDirection: 'row',
  },
});