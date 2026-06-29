# Build Adivery React Native Plugin

Build targets for this project. Run the steps below based on what the user asks for. If no specific target is given, run all steps in order.

> **Paths**: All commands are relative to the repository root (the directory containing the root `package.json` with `"name": "adivery"`). Each step that uses `cd` assumes you start from the repo root. Do not hardcode absolute paths — this skill must work on any clone.

---

## 0. Environment checks

Before anything else, verify the environment:

```bash
# Check Node / yarn
node --version   # need 18+
yarn --version

# Check Java — Gradle 9 requires JDK 17+
java -version    # must say version 17 or higher

# Check Android SDK
echo $ANDROID_HOME
```

**If ANDROID_HOME is empty**, ask the user:
> "ANDROID_HOME is not set. Where is your Android SDK? (Linux: ~/Android/Sdk, macOS: ~/Library/Android/sdk)"
Then set it for subsequent commands: `export ANDROID_HOME=<user answer>`.

**If Java is below 17**, warn:
> "JDK 17+ is required (Gradle 9 / AGP 8.7.2). Please install it or set JAVA_HOME."
Do not continue with Android steps until resolved.

---

## 1. Install dependencies (root + example)

All commands assume you are at the repository root (the directory containing `package.json` with `"name": "adivery"`). The `bootstrap` script installs both root and example dependencies:

```bash
yarn bootstrap
```

If you prefer to do it manually:

```bash
# Root plugin dependencies
yarn install

# Example app dependencies
yarn --cwd example install
```

---

## 2. Build the TypeScript library

This compiles `src/` into `lib/` (commonjs + esm + typescript types). Run from the root:

```bash
yarn prepare
```

Known issue: if TypeScript complains about `importsNotUsedAsValues`, that option was removed in TS 5.5. It should already be gone from `tsconfig.json`, but if it reappears, remove it.

---

## 3. Bundle JS assets for the Android example app

React Native 0.85+ in bridgeless mode loads the JS bundle from APK assets, NOT from Metro dev server.
The bundle must be pre-generated before building the APK.

```bash
mkdir -p example/android/app/src/main/assets

node_modules/.bin/react-native bundle \
  --platform android \
  --dev true \
  --entry-file index.js \
  --bundle-output example/android/app/src/main/assets/index.android.bundle \
  --assets-dest example/android/app/src/main/res
```

Run this from the project root (not inside `example/`). The entry file `index.js` re-exports from `src/index.tsx`.

---

## 4. Build the Android example APK

```bash
cd example/android
./gradlew assembleDebug
```

**Known build issues and fixes:**

- **`jcenter()` error**: Gradle 9 removed jcenter support. It must not appear in any `build.gradle`. If it does, remove it.
- **`Plugin with id 'com.facebook.react.rootproject' not found`**: The root `build.gradle` must use `plugins { id "..." }` block syntax, NOT `apply plugin: "..."`. The `@react-native/gradle-plugin` composite build only works with the `plugins {}` DSL.
- **`extractAnnotations` fails (intellij-core-31.12.0.jar not found)**: A stub JAR is in `example/android/local-maven/`. Make sure `allprojects.repositories` in `example/android/build.gradle` includes `maven { url "$rootDir/local-maven" }`.
- **JVM target mismatch**: `android/build.gradle` (the plugin library) must use `JavaVersion.VERSION_17` and `jvmTarget = "17"`.
- **`libreact_featureflagsjni.so` not found crash**: RN 0.76+ merged all `.so` into `libreactnative.so`. `MainApplication.kt` must call `ReactNativeApplicationEntryPoint.loadReactNative(this)` in `onCreate()`, NOT `SoLoader.init(this, false)`.
- **`Unable to load script` at runtime**: The JS bundle is missing from assets. Re-run step 3.

The debug APK lands at:
`example/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5. Install and run on a connected device (optional)

```bash
# Check connected devices
adb devices

# Install the APK
adb install -r example/android/app/build/outputs/apk/debug/app-debug.apk

# View logcat (filter to the app)
adb logcat --pid=$(adb shell pidof -s com.example.adivery) 2>/dev/null | head -100
```

---

## 6. Publish to npm (only when user explicitly asks)

The project uses `release-it` (configured in `package.json` under `"release-it"`). It handles git tagging, GitHub release, changelog generation, and npm publish in one step.

### Prerequisites
- Make sure you are logged in or have an automation token in `~/.npmrc`
- Run `yarn prepare` first to ensure `lib/` is up to date

### Login check
```bash
npm whoami
```
Note: automation tokens return 401 for `whoami` — that is expected and fine. They still publish.

If not logged in and no automation token:
> "You need to authenticate with npm. Run `npm login` in your terminal (type `! npm login` in this chat) and follow the prompts."

### Normal release (bumps version, tags, publishes)
```bash
yarn release
```
`release-it` will interactively ask which semver bump (patch / minor / major) to use, show a changelog preview, then publish.

### Publish the current version without bumping
If the version in `package.json` is already correct and you don't want `release-it` to increment it:
```bash
yarn release --no-increment
```
This skips the version bump and publishes exactly what is in `package.json`.

### Skip GitHub release (npm-only)
```bash
yarn release --no-github.release
```

### If 2FA is required
`release-it` delegates to `npm publish` internally. If npm rejects with `E403 Two-factor authentication required`:
```bash
yarn release --npm.publishArgs="--otp=<OTP>"
```
Ask the user: "Please enter your npm OTP (from your authenticator app)."

Alternatively, use a Granular Access Token with the "bypass 2FA" option from npmjs.com → Access Tokens — then no OTP is needed.

### Fallback: plain npm publish (bypasses release-it entirely)
Only use this if release-it itself is broken:
```bash
npm publish
```

If you get `E404 Not Found` for a package that was previously published, the user is likely not authenticated. Check `~/.npmrc` for a valid `_authToken`.

**Security reminder**: never log the contents of `~/.npmrc`. If an auth token appears in terminal output, advise the user to revoke it immediately at npmjs.com → Access Tokens.

---

## Architecture notes (for context)

- **Plugin source**: `src/index.tsx` — the only JS/TS interface users interact with
- **Plugin native**: `android/src/main/java/com/adivery/` — `AdiveryModule.kt`, `AdiveryPackage.kt`, `AdiveryBannerAdViewManager.kt`, `BannerViewGroup.kt`
- **Native events**: emitted via `RCTDeviceEventEmitter` in `handleGlobalListener()` (`AdiveryModule.kt:70`), subscribed via `NativeEventEmitter(NativeModules.AdiveryModule)` in JS
- **New arch note**: `addGlobalListener` (the old broken method with 13 Promise params) was removed. It violated TurboModule rules and caused `ParsingException: Promises must be used as last parameter only` on RN new arch.
- **RN version**: example app uses 0.85.3 with `newArchEnabled=true` and `hermesEnabled=true`
- **Gradle**: 9.3.1 (required by `@react-native/gradle-plugin`), AGP 8.7.2, Kotlin 2.0.21, JVM 17
