import { Banner, LargeBanner, MediumRectangle } from 'adivery';
import React from 'react';
import { EmitterSubscription, PixelRatio} from 'react-native';
import {
    requireNativeComponent,
    NativeEventEmitter,
    StyleSheet,
} from 'react-native';
import { NativeModules } from 'react-native';

const ComponentName = 'AdiveryBannerAdView';

type BannerProps = {
    style: any
    placementId: string
    bannerSize: number
}

const RCTAdiveryBanner = requireNativeComponent<BannerProps>(ComponentName)

type RCTBannerProps = {
    placementId: string
    bannerSize: number
    onAdLoaded: () => void
    onAdClicked: () => void
    onError: (message: string) => void
}


class AdiveryBanner extends React.Component<RCTBannerProps> {

    onAdLoaded : () => void
    onAdClicked: () => void
    onError: (message: string) => void

    adLoadSubscription?: EmitterSubscription
    adClickedSubscription?: EmitterSubscription
    adErrorSubscription?: EmitterSubscription

    BANNER_LOADED_EVENT = "AdiveryBannerLoaded"
    BANNER_CLICKED_EVENT = "AdiveryBannerClicked"
    BANNER_ERROR_EVENT = "AdiveryBannerError"
    

    props : RCTBannerProps

    constructor(props: RCTBannerProps){
        super(props)
        this.props = props
        this._onAdLoaded = this._onAdLoaded.bind(this)
        this._onAdClicked = this._onAdClicked.bind(this)
        this._onError = this._onError.bind(this)
        this.onAdLoaded = props.onAdLoaded
        this.onAdClicked = props.onAdClicked
        this.onError = props.onError
    }

    componentDidMount() {
        const eventEmmiter = new NativeEventEmitter(NativeModules.Adivery)
        this.adLoadSubscription = eventEmmiter.addListener(this.BANNER_LOADED_EVENT, (event) => {
            if (event.placementId == this.props.placementId){
                this._onAdLoaded()
            }
        })
        this.adClickedSubscription = eventEmmiter.addListener(this.BANNER_CLICKED_EVENT, (event) => {
            if (event.placementId == this.props.placementId){
                this._onAdClicked()
            }
        })
        this.adErrorSubscription = eventEmmiter.addListener(this.BANNER_ERROR_EVENT, (event) => {
            if (event.placementId == this.props.placementId){
                this._onError(event.message)
            }
        })
    }

    componentWillUnmount(){
        this.adLoadSubscription?.remove()
        this.adClickedSubscription?.remove()
        this.adErrorSubscription?.remove()
    }

    _onAdLoaded() {
        if (!this.onAdLoaded){
            return
        }
        this.onAdLoaded()
    }

    _onAdClicked(){
        if (!this.onAdClicked){
            return
        }
        this.onAdClicked()
    }

    _onError(message: string){
        if(!this.onError){
            return
        }
        this.onError(message)
    }

    render(){
        return <RCTAdiveryBanner 
            style={{width: this._getWidth(), height:this._getHeight()}} 
            placementId={this.props.placementId} 
            bannerSize={this.props.bannerSize}/>
    }

    style = StyleSheet.create({
        container: {
            justifyContent: 'center',
        },
    })

    _getWidth() {
        switch (this.props.bannerSize){
            case Banner:
                return 320
            case LargeBanner:
                return 320
            case MediumRectangle:
                return 300
        }
        return '100%'
    }

    _getHeight() {
        switch (this.props.bannerSize){
            case Banner:
                return 50
            case LargeBanner:
                return 100
            case MediumRectangle:
                return 250
        }
        const dpi = this._getScreenDpi()
        if (dpi <= 240){
            return 50;
        }
        return 90
    }

    _getScreenDpi() {
        const ratio = PixelRatio.get()
        const dpi = ratio * 160;
        return dpi;
    }

}

export default AdiveryBanner
