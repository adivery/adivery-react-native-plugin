package com.adivery

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class AdiveryPackage : TurboReactPackage() {
    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        if (name == AdiveryModule.NAME) AdiveryModule(context) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            AdiveryModule.NAME to ReactModuleInfo(
                AdiveryModule.NAME,
                AdiveryModule.NAME,
                false,
                false,
                true,
                false,
                BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            )
        )
    }

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(AdiveryBannerAdViewManager())
}
