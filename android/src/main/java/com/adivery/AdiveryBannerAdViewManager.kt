package com.adivery

import android.content.Context
import android.util.DisplayMetrics
import android.util.Log
import android.view.View
import android.view.View.MeasureSpec
import com.adivery.sdk.AdiveryAdListener
import com.adivery.sdk.AdiveryBannerAdView
import com.adivery.sdk.BannerSize
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup


const val BANNER_LOADED_EVENT = "AdiveryBannerLoaded"
const val BANNER_SHOWN_EVENT = "AdiveryBannerShown"
const val BANNER_CLICKED_EVENT = "AdiveryBannerClicked"
const val BANNER_ERROR_EVENT = "AdiveryBannerError"


// One per <AdiveryBanner> on screen. React Native shares a single view manager between every
// banner, so each banner's ad view and props live here rather than on the manager.
class BannerViewGroup(context: Context) : ReactViewGroup(context) {
  lateinit var banner: AdiveryBannerAdView
  var placementId: String? = null
  var isPlacementSet = false
  var isBannerSizeSet = false

  public val measureAndLayout = Runnable {
    for (i in 0 until childCount) {
      val child = getChildAt(i)
      child.measure(
        MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
      )
      child.layout(0, 0, child.measuredWidth, child.measuredHeight)
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    post(measureAndLayout)
  }

  fun loadAdOnceConfigured() {
    if (isPlacementSet && isBannerSizeSet) {
      banner.loadAd()
    }
  }
}

class AdiveryBannerAdViewManager : ViewGroupManager<BannerViewGroup>() {

  val bannerSizeSmall = 0
  val bannerSizeSmart = 1
  val bannerSizeLarge = 2
  val bannerSizeMediumRectangle = 3

  override fun getName() = "AdiveryBannerAdView"

  fun sendEvent(reactContext: ThemedReactContext, eventName: String, params: WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  override fun addView(parent: BannerViewGroup, child: View, index: Int) {
    throw RuntimeException("AdiveryBanner cannot have subviews");
  }

  override fun needsCustomLayoutForChildren(): Boolean {
    return true
  }



  fun convertDpToPixel(dp: Float, context: Context): Float {
    // Support MATCH_PARENT and WRAP_CONTENT sizes.
    return if (dp < 0) {
      dp
    } else dp * (context.resources.displayMetrics.densityDpi.toFloat() / DisplayMetrics.DENSITY_DEFAULT)
  }

  override fun createViewInstance(reactContext: ThemedReactContext): BannerViewGroup {
    Log.d("Adivery", "creating view instance")
    val layout = BannerViewGroup(reactContext)
    val banner = AdiveryBannerAdView(reactContext)
    banner.setBannerAdListener(object : AdiveryAdListener(){
      override fun onAdLoaded() {
        layout.post(layout.measureAndLayout)
        val params = Arguments.createMap()
        params.putString("placementId", layout.placementId)
        sendEvent(reactContext, BANNER_LOADED_EVENT, params)
      }

      override fun onAdShown() {
        val params = Arguments.createMap()
        params.putString("placementId", layout.placementId)
        sendEvent(reactContext, BANNER_SHOWN_EVENT, params)
      }

      override fun onAdClicked() {
        val params = Arguments.createMap()
        params.putString("placementId", layout.placementId)
        sendEvent(reactContext, BANNER_CLICKED_EVENT, params)
      }

      override fun onError(reason: String) {
        val params = Arguments.createMap()
        params.putString("placementId", layout.placementId)
        params.putString("message", reason)
        sendEvent(reactContext, BANNER_ERROR_EVENT, params)
      }
    })
    layout.banner = banner
    layout.addView(banner)
    return layout
  }

  @ReactProp(name = "placementId")
  fun setPlacementId(view: BannerViewGroup, placementId: String) {
    Log.d("Adivery", "set placement id")
    view.placementId = placementId
    view.banner.setPlacementId(placementId)
    view.isPlacementSet = true
    view.loadAdOnceConfigured()
  }


  @ReactProp(name = "bannerSize")
  fun setBannerSize(view: BannerViewGroup, bannerSize: Int) {
    Log.d("Adivery", "set banner size")
    val bannerSizeModel = when (bannerSize) {
      bannerSizeSmall -> BannerSize.BANNER
      bannerSizeSmart -> BannerSize.SMART_BANNER
      bannerSizeLarge -> BannerSize.LARGE_BANNER
      else -> BannerSize.MEDIUM_RECTANGLE
    }
    view.banner.setBannerSize(bannerSizeModel)
    view.isBannerSizeSet = true
    view.loadAdOnceConfigured()
  }

}
