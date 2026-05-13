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
import java.util.concurrent.atomic.AtomicBoolean
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
  NativeAdiverySpec(reactContext) {

  companion object {
    const val NAME = "AdiveryModule"
  }

  lateinit var listener: AdiveryListener

  val nativeMap = HashMap<String, NativeAd>()

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  override fun configure(appId: String) {
    Adivery.configure(reactContext.applicationContext as Application, appId)
    handleGlobalListener()
  }

  @ReactMethod
  override fun setUserId(userId: String) {
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
  override fun prepareRewardedAd(placementId: String) {
    Adivery.prepareRewardedAd(reactContext, placementId)
  }

  @ReactMethod
  override fun prepareInterstitialAd(placementId: String) {
    Adivery.prepareInterstitialAd(reactContext, placementId)
  }

  @ReactMethod
  override fun prepareAppOpenAd(placementId: String) {
    Adivery.prepareAppOpenAd(reactContext.currentActivity, placementId)
  }

  @ReactMethod
  override fun showAd(placementId: String) {
    Log.d("Adivery", "showAd")
    Handler(Looper.getMainLooper()).post {
      Adivery.showAd(placementId)
    }
  }

  @ReactMethod
  override fun showAppOpenAd(placementId: String) {
    Log.d("Adivery", "showAppOpenAd")
    Handler(Looper.getMainLooper()).post {
      reactContext.currentActivity?.apply {
        Adivery.showAppOpenAd(this, placementId)
      }
    }
  }

  @ReactMethod
  override fun isLoaded(placementId: String, isLoaded: Promise) {
    Log.d("Adivery", "isLoaded")
    isLoaded.resolve(Adivery.isLoaded(placementId))
  }

  @ReactMethod
  override fun requestNativeAd(placementId: String, promise: Promise) {
    val settled = AtomicBoolean(false)
    Adivery.requestNativeAd(reactContext, placementId, object : AdiveryNativeCallback() {
      override fun onAdLoaded(ad: NativeAd) {
        if (!settled.compareAndSet(false, true)) return
        if (ad !is AdiveryNativeAd) {
          promise.reject(
            "E_UNSUPPORTED_AD_TYPE",
            "Native ad type ${ad::class.java.simpleName} is not supported"
          )
          return
        }
        val nativeAd = Arguments.createMap()
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

      override fun onAdLoadFailed(reason: String) {
        if (!settled.compareAndSet(false, true)) return
        promise.reject("E_AD_LOAD_FAILED", reason)
      }

      override fun onAdShowFailed(reason: String) {
        if (!settled.compareAndSet(false, true)) return
        promise.reject("E_AD_SHOW_FAILED", reason)
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
    image.compress(compressFormat!!, quality, byteArrayOS)
    return Base64.encodeToString(byteArrayOS.toByteArray(), Base64.NO_WRAP)
  }

  @ReactMethod
  override fun recordNativeAdImpression(id: String) {
    val ad = nativeMap[id]
    if (ad is AdiveryNativeAd) {
      ad.recordImpression()
    }
  }

  @ReactMethod
  override fun recordNativeAdClick(id: String) {
    val ad = nativeMap[id]
    if (ad is AdiveryNativeAd) {
      ad.recordClick()
    }
  }

}
