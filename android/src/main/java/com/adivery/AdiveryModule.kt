package com.adivery

import android.app.Application
import android.graphics.Bitmap
import android.graphics.Bitmap.CompressFormat
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.adivery.sdk.Adivery
import com.adivery.sdk.AdiveryListener
import com.adivery.sdk.AdiveryNativeCallback
import com.adivery.sdk.NativeAd
import com.adivery.sdk.networks.adivery.AdiveryNativeAd
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.util.*
import kotlin.collections.HashMap

const val REWARD_LOADED_EVENT_NAME = "AdiveryRewardedLoaded"
const val REWARD_SHOWN_EVENT_NAME = "AdiveryRewardedShown"
const val REWARD_CLICKED_EVENT_NAME = "AdiveryRewardedClick"
const val REWARD_CLOSED_EVENT_NAME = "AdiveryRewardedClosed"
const val INTERSTITIAL_LOADED_EVENT_NAME = "AdiveryInterstitialLoaded"
const val INTERSTITIAL_SHOWN_EVENT_NAME = "AdiveryInterstitialShown"
const val INTERSTITIAL_CLICKED_EVENT_NAME = "AdiveryInterstitialClick"
const val INTERSTITIAL_CLOSED_EVENT_NAME = "AdiveryInterstitialClosed"
const val APP_OPEN_LOADED_EVENT_NAME = "AdiveryAppOpenLoaded"
const val APP_OPEN_SHOWN_EVENT_NAME = "AdiveryAppOpenShown"
const val APP_OPEN_CLICKED_EVENT_NAME = "AdiveryAppOpenClick"
const val APP_OPEN_CLOSED_EVENT_NAME = "AdiveryAppOpenClosed"
const val ON_ERROR_EVENT_NAME = "AdiveryOnError"

class AdiveryModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  lateinit var listener: AdiveryListener

  val nativeMap = HashMap<String, NativeAd>()

  override fun getName(): String {
    return "AdiveryModule"
  }

  override fun canOverrideExistingModule(): Boolean {
    return false
  }

  @ReactMethod
  fun configure(appId: String) {
    Adivery.configure(reactContext.applicationContext as Application, appId)
    handleGlobalListener()
  }

  @ReactMethod
  fun setUserId(userId: String) {
    Adivery.setUserId(userId)
  }

  fun sendEvent(reactContext: ReactApplicationContext, eventName: String, params: WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun handleGlobalListener() {
    if (this::listener.isInitialized) {
      return
    }
    listener = object : AdiveryListener() {
      override fun onRewardedAdLoaded(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, REWARD_LOADED_EVENT_NAME, params)
      }

      override fun onRewardedAdShown(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, REWARD_SHOWN_EVENT_NAME, params)
      }

      override fun onRewardedAdClicked(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, REWARD_CLICKED_EVENT_NAME, params)
      }

      override fun onRewardedAdClosed(placementId: String, isRewarded: Boolean) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        params.putBoolean("isRewarded", isRewarded)
        sendEvent(reactContext, REWARD_CLOSED_EVENT_NAME, params)
      }

      override fun onInterstitialAdLoaded(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, INTERSTITIAL_LOADED_EVENT_NAME, params)
      }

      override fun onInterstitialAdShown(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, INTERSTITIAL_SHOWN_EVENT_NAME, params)
      }

      override fun onInterstitialAdClicked(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, INTERSTITIAL_CLICKED_EVENT_NAME, params)
      }

      override fun onInterstitialAdClosed(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, INTERSTITIAL_CLOSED_EVENT_NAME, params)
      }

      override fun onAppOpenAdLoaded(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, APP_OPEN_LOADED_EVENT_NAME, params)
      }

      override fun onAppOpenAdShown(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, APP_OPEN_SHOWN_EVENT_NAME, params)
      }

      override fun onAppOpenAdClicked(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, APP_OPEN_CLICKED_EVENT_NAME, params)
      }

      override fun onAppOpenAdClosed(placementId: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        sendEvent(reactContext, APP_OPEN_CLOSED_EVENT_NAME, params)
      }

      override fun log(placementId: String, message: String) {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        params.putString("message", message)
        sendEvent(reactContext, ON_ERROR_EVENT_NAME, params)
      }
    }
    Adivery.addGlobalListener(listener)
  }

  @ReactMethod
  fun prepareRewardedAd(placementId: String) {
    Adivery.prepareRewardedAd(reactContext, placementId)
  }

  @ReactMethod
  fun prepareInterstitialAd(placementId: String) {
    Adivery.prepareInterstitialAd(reactContext, placementId)
  }

  @ReactMethod
  fun prepareAppOpenAd(placementId: String) {
    Adivery.prepareAppOpenAd(reactContext.currentActivity, placementId)
  }

  @ReactMethod
  fun showAd(placementId: String) {
    Log.d("Adivery", "showAd")
    Handler(Looper.getMainLooper()).post {
      Adivery.showAd(placementId)
    }
  }

  @ReactMethod
  fun showAppOpenAd(placementId: String) {
    Log.d("Adivery", "showAppOpenAd")
    Handler(Looper.getMainLooper()).post {
      reactContext.currentActivity?.apply {
        Adivery.showAppOpenAd(this, placementId)
      }
    }
  }

  @ReactMethod
  fun isLoaded(placementId: String, isLoaded: Promise) {
    Log.d("Adivery", "isLoaded")
    isLoaded.resolve(Adivery.isLoaded(placementId))
  }

  @ReactMethod
  fun requestNativeAd(placementId: String, promise: Promise) {
    Adivery.requestNativeAd(reactContext, placementId, object : AdiveryNativeCallback() {
      override fun onAdLoaded(ad: NativeAd) {
        val nativeAd = Arguments.createMap()
        if (ad is AdiveryNativeAd) {
          nativeAd.putString("headline", ad.headline)
          nativeAd.putString("description", ad.description)
          nativeAd.putString("advertiser", ad.advertiser)
          nativeAd.putString("call_to_action", ad.callToAction)
          val icon = drawableToBitmap(ad.icon)
          if (icon != null) {
            nativeAd.putString("icon", encodeToBase64(icon, CompressFormat.JPEG, 100))
          } else {
            nativeAd.putNull("icon")
          }
          val image = drawableToBitmap(ad.image)
          if (image != null) {
            nativeAd.putString("image", encodeToBase64(image, CompressFormat.JPEG, 100))
          } else {
            nativeAd.putNull("image")
          }
          val id = UUID.randomUUID().toString()
          nativeAd.putString("id", id)
          nativeMap[id] = ad
          promise.resolve(nativeAd)
        }
      }

      override fun onAdLoadFailed(reason: String) {
        promise.reject(reason)
      }

      override fun onAdShowFailed(reason: String) {
        promise.reject(reason)
      }
    })
  }

  fun drawableToBitmap(drawable: Drawable?): Bitmap? {
    if (drawable == null){
      return null
    }
    var bitmap: Bitmap? = null
    if (drawable is BitmapDrawable) {
      val bitmapDrawable = drawable
      if (bitmapDrawable.bitmap != null) {
        return bitmapDrawable.bitmap
      }
    }
    bitmap = if (drawable.intrinsicWidth <= 0 || drawable.intrinsicHeight <= 0) {
      Bitmap.createBitmap(
        1,
        1,
        Bitmap.Config.ARGB_8888
      ) // Single color bitmap will be created of 1x1 pixel
    } else {
      Bitmap.createBitmap(
        drawable.intrinsicWidth,
        drawable.intrinsicHeight,
        Bitmap.Config.ARGB_8888
      )
    }
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }

  fun encodeToBase64(image: Bitmap, compressFormat: CompressFormat?, quality: Int): String? {
    val byteArrayOS = ByteArrayOutputStream()
    image.compress(compressFormat, quality, byteArrayOS)
    return Base64.encodeToString(byteArrayOS.toByteArray(), Base64.NO_WRAP)
  }

  @ReactMethod
  fun recordNativeAdImpression(id: String) {
    val ad = nativeMap[id]
    if (ad is AdiveryNativeAd) {
      ad.recordImpression()
    }
  }

  @ReactMethod
  fun recordNativeAdClick(id: String) {
    val ad = nativeMap[id]
    if (ad is AdiveryNativeAd) {
      ad.recordClick()
    }
  }

  @ReactMethod
  fun addGlobalListener(
    onRewardedAdLoaded: Promise?,
    onRewardedAdShown: Promise?,
    onRewardedAdClosed: Promise?,
    onRewardedAdClicked: Promise?,
    onInterstitialAdLoaded: Promise?,
    onInterstitialAdShown: Promise?,
    onInterstitialAdClicked: Promise?,
    onInterstitialAdClosed: Promise?,
    onAppOpenAdLoaded: Promise?,
    onAppOpenAdShown: Promise?,
    onAppOpenAdClicked: Promise?,
    onAppOpenAdClosed: Promise?,
    onError: Promise?
  ) {
    if (this::listener.isInitialized) {
      Adivery.removeGlobalListener(listener)
    }

    listener = object : AdiveryListener() {
      override fun onRewardedAdLoaded(placementId: String) {
        onRewardedAdLoaded?.resolve(placementId)
      }

      override fun onRewardedAdShown(placementId: String) {
        onRewardedAdShown?.resolve(placementId)
      }

      override fun onRewardedAdClicked(placementId: String) {
        onRewardedAdClicked?.resolve(placementId)
      }

      override fun onRewardedAdClosed(placementId: String, isRewarded: Boolean) {
        val map = Arguments.createMap()
        map.putString("placementId", placementId)
        map.putBoolean("isRewarded", isRewarded)
        onRewardedAdClosed?.resolve(map)
      }

      override fun onInterstitialAdLoaded(placementId: String) {
        onInterstitialAdLoaded?.resolve(placementId)
      }

      override fun onInterstitialAdShown(placementId: String) {
        onInterstitialAdShown?.resolve(placementId)
      }

      override fun onInterstitialAdClicked(placementId: String) {
        onInterstitialAdClicked?.resolve(placementId)
      }

      override fun onInterstitialAdClosed(placement: String) {
        onInterstitialAdClosed?.resolve(placement)
      }

      override fun onAppOpenAdLoaded(placementId: String) {
        onAppOpenAdLoaded?.resolve(placementId)
      }

      override fun onAppOpenAdShown(placementId: String) {
        onAppOpenAdShown?.resolve(placementId)
      }

      override fun onAppOpenAdClicked(placementId: String) {
        onAppOpenAdClicked?.resolve(placementId)
      }

      override fun onAppOpenAdClosed(placementId: String) {
        onAppOpenAdClosed?.resolve(placementId)
      }

      override fun log(placementId: String, message: String) {
        val map = Arguments.createMap()
        map.putString("placementId", placementId)
        map.putString("message", message)
        onError?.resolve(map)
      }
    }

  }

}
