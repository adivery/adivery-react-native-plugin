---
name: build-example
description: >-
  Build the Adivery React Native plugin and its Android example app:
  install dependencies, run the checks (typecheck, lint, tests), build the
  TypeScript library, bundle the example's JS, build the debug APK, and
  optionally install and run it on a connected device. Use when the user
  asks to "build the plugin", "build the example", "run the example on my
  phone", "check the build", or similar. It never publishes anything; for
  publishing to npm and GitHub, see release-plugin.
---

# Build the plugin and the Android example

Run the steps the user asks for. If they don't name a step, run them all in
order. All commands start from the repository root, the directory whose
`package.json` has `"name": "adivery"`. Don't hardcode absolute paths; this
skill has to work on any clone.

## 0. Environment checks

```bash
node --version   # need 18+
yarn --version
java -version    # Gradle 9 needs JDK 17 or newer
echo $ANDROID_HOME
```

- **If `ANDROID_HOME` is empty:** read `sdk.dir` from
  `example/android/local.properties`. If that doesn't exist either, ask the
  user: "ANDROID_HOME is not set. Where is your Android SDK? (Linux:
  ~/Android/Sdk, macOS: ~/Library/Android/sdk)". Then
  `export ANDROID_HOME=<answer>` for the commands that follow.
- **If Java is below 17:** warn that JDK 17+ is required (Gradle 9 /
  AGP 8.7.2), and don't continue with the Android steps until it's
  resolved.

## 1. Install dependencies (root and example)

```bash
yarn bootstrap            # = yarn --cwd example install && yarn install
```

## 2. Checks and the TypeScript library

```bash
yarn typescript   # tsc --noEmit
yarn lint         # eslint; must report 0 errors (warnings are fine)
yarn test         # jest; tests in src/__tests__ mock react-native and check the JS bridge
yarn prepare      # bob build: src/ -> lib/ (commonjs, esm and type definitions; lib/ is gitignored)
```

**Known issue:** if TypeScript complains about `importsNotUsedAsValues`,
that option was removed in TS 5.5. It shouldn't be in `tsconfig.json`; if it
reappears, remove it.

## 3. Bundle the JS for the Android example

React Native 0.85+ in bridgeless mode loads the JS bundle from the APK's
assets, not from the Metro dev server. So generate the bundle before
building the APK, and regenerate it after any JS change, or the APK runs
the old JS.

```bash
# Run from example/: metro.config.js lives there, and the Babel module-resolver alias
# that maps the package name to ../src only applies when the bundler's project root is
# example/. Running from the repo root fails with "No Metro config found".
cd example
mkdir -p android/app/src/main/assets

node_modules/.bin/react-native bundle \
  --platform android \
  --dev true \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

The entry file is `example/index.js`, which registers `./src/App`. The
bundle and the images it writes into `res/` are gitignored.

**Known issue, `Unable to resolve module adivery-publisher`:**
`example/src/App.js` must import from `'adivery'`, the current package name,
not the old `'adivery-publisher'`. `example/babel.config.js` aliases the
package name (`adivery`) to `../src`, so no other import string resolves.

## 4. Build the Android example APK

```bash
cd example/android
./gradlew assembleDebug
```

The debug APK lands at
`example/android/app/build/outputs/apk/debug/app-debug.apk`.

To confirm which Adivery SDK it was built against:
`./gradlew :adivery:dependencies --configuration releaseRuntimeClasspath | grep com.adivery:sdk`.

**Known build issues and fixes:**
- **`jcenter()` error:** Gradle 9 removed jcenter support. Remove it from
  any `build.gradle` it appears in.
- **`Plugin with id 'com.facebook.react.rootproject' not found`:** the root
  `build.gradle` must use the `plugins { id "..." }` block, not
  `apply plugin: "..."`. The `@react-native/gradle-plugin` composite build
  only works with the `plugins {}` DSL.
- **`extractAnnotations` fails (`intellij-core-31.12.0.jar` not found):** a
  stub JAR is committed under `example/android/local-maven/`. Check that
  `allprojects.repositories` in `example/android/build.gradle` includes
  `maven { url "$rootDir/local-maven" }`.
- **JVM target mismatch:** `android/build.gradle` (the plugin library) must
  use `JavaVersion.VERSION_17` and `jvmTarget = "17"`.
- **`libreact_featureflagsjni.so` not found (crash):** React Native 0.76+
  merged all `.so` files into `libreactnative.so`. `MainApplication.kt` must
  call `ReactNativeApplicationEntryPoint.loadReactNative(this)` in
  `onCreate()`, not `SoLoader.init(this, false)`.
- **`Unable to load script` at runtime:** the JS bundle is missing from the
  assets. Re-run step 3.

## 5. Install and run on a connected device (optional)

```bash
adb devices
adb install -r example/android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.example.adivery/.MainActivity
adb logcat -d -s ReactNativeJS:V | tail -100   # the example's console.log output
```

- **Locked phone:** the app pauses. Wake it with
  `adb shell input keyevent KEYCODE_WAKEUP` and ask the user to unlock it.
- **Wireless ADB:** it drops often. Wait for `adb devices` to list the
  device again before giving up.

---

## Architecture notes (for context)

- **Plugin source:** `src/index.tsx` is the only JS/TS interface users work
  with. `src/adivery-banner-ad-view.tsx` is the banner component, and
  `src/AdiveryNativeAd.tsx` the native ad component.
- **Plugin native code:** `android/src/main/java/com/adivery/`:
  - `AdiveryModule.kt`: the native module. It calls the SDK's public API
    and forwards `AdiveryListener` callbacks as events.
  - `AdiveryBannerAdViewManager.kt`: the banner view manager.
  - `AdiveryPackage.kt`: registers both of the above.
- **Native events:** emitted with `RCTDeviceEventEmitter`, and subscribed to
  with `NativeEventEmitter(NativeModules.AdiveryModule)` in JS. Event names
  and payload keys must match on both sides; the `new-plugin-version`
  skill's `scripts/bridge.py check` verifies that.
- **New architecture:** `@ReactMethod` parameters may include a `Promise`
  only as the last one. The old `addGlobalListener` with 13 Promise
  parameters was removed because it violated that and threw
  `ParsingException: Promises must be used as last parameter only`.
- **Versions:** the example uses React Native 0.85.3 with
  `newArchEnabled=true` and `hermesEnabled=true`; Gradle 9.3.1 (required by
  `@react-native/gradle-plugin`), AGP 8.7.2, Kotlin 2.0.21, JVM 17.
