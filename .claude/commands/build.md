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
# Run from example/ — metro.config.js lives there, and the Metro/Babel
# module-resolver alias that maps the package name to ../src is only applied
# when the bundler's project root is example/. Running from the repo root fails
# with "No Metro config found".
cd example
mkdir -p android/app/src/main/assets

node_modules/.bin/react-native bundle \
  --platform android \
  --dev true \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

The entry file is `example/index.js`, which registers `./src/App`.

**Known issue — `Unable to resolve module adivery-publisher`**: `example/src/App.js` must import from `'adivery'` (the current package name), NOT the old `'adivery-publisher'`. `example/babel.config.js` aliases `pak.name` (`adivery`) → `../src`, so any other import string won't resolve. Fix the import if you hit this.

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

## 6. Publish to npm (only when the user explicitly asks)

The project uses `release-it` (configured in `package.json` under `"release-it"`): git tag `v${version}`, optional GitHub release, conventional-changelog, and `npm publish`.

### Prerequisites
- Be logged in to npm, or have an automation token in `~/.npmrc` (`npm whoami` should print the user; automation tokens may 401 on `whoami` yet still publish).
- The version in `package.json` is normally already bumped and committed (the "Release X.Y.Z version" commit, which also bumps the native `com.adivery:sdk` dependency in `android/build.gradle`). **Confirm the exact version with the Read tool right before publishing** — read the file directly rather than relying on a digit printed through shell output (output filters/proxies can reformat values, and amended commits can shift what's in the tree).
- Run `yarn prepare` so `lib/` is up to date.

If not logged in and no automation token:
> "You need to authenticate with npm. Run `npm login` in your terminal (type `! npm login` in this chat) and follow the prompts."

### Recommended command (publish the already-committed version)

This repo's release commit already bumps `package.json`, the working tree usually has untracked `example/` build artifacts, and the repo has no prior tags. The invocation that works under those conditions:

```bash
node_modules/.bin/release-it \
  --no-increment \                  # version is already set + committed
  --no-git.commit \                 # the "Release X" commit already exists; don't make an empty one
  --no-git.requireCleanWorkingDir \ # tolerate untracked example/ build artifacts
  --ci                              # non-interactive (no TTY in this harness)
```

Notes:
- Use the `--no-git.requireCleanWorkingDir` form. `--git.requireCleanWorkingDir=false` does **not** disable the check.
- Always **dry-run first** to preview the exact sequence: append `--dry-run` to the command above.
- release-it order is **npm publish → git tag → git push → GitHub release**. Safety boundary:
  - A failure **at or before npm publish** is safe to retry (the version isn't live yet).
  - A failure **after npm publish** means the version IS live — do NOT re-run release-it (it will 403 "version exists"); finish tag/push/GitHub-release manually.

### GitHub release behavior depends on whether `GITHUB_TOKEN` is set
- **`GITHUB_TOKEN` is set** → add `--no-github.release` so release-it does **npm + tag + push only**. Step 7 then creates the GitHub release *with the release APK attached*, after user confirmation:
  ```bash
  node_modules/.bin/release-it --no-increment --no-git.commit --no-git.requireCleanWorkingDir --no-github.release --ci
  ```
- **`GITHUB_TOKEN` is not set** → run the command WITHOUT `--no-github.release`. With no token, release-it falls back to printing a **pre-filled web URL** for a manual GitHub release (the previous behavior). npm + tag + push still happen.

### If npm 2FA / OTP is required
If npm rejects with `E403 Two-factor authentication required` / `EOTP`, ask the user for their OTP and retry (a failed publish is harmless):
```bash
node_modules/.bin/release-it --no-increment --no-git.commit --no-git.requireCleanWorkingDir --ci --npm.publishArgs="--otp=<OTP>"
```
(Or use a Granular Access Token with the "bypass 2FA" option — then no OTP is needed.)

### Verify (with the Read tool / a raw shell, not a filtering proxy)
```bash
npm view adivery version                     # should equal package.json
git ls-remote origin refs/tags/v<version>    # tag pushed
```

### Fallback: plain `npm publish` (only if release-it itself is broken)
```bash
npm publish
```
`E404 Not Found` for a previously-published package usually means not authenticated — check `~/.npmrc` for a valid `_authToken`.

**Security reminder**: never log the contents of `~/.npmrc`. If an npm or GitHub token appears in output, advise the user to revoke it (npmjs.com → Access Tokens / GitHub → Developer settings → Personal access tokens).

---

## 7. Create the GitHub release with the release APK

Run this **after** step 6 has published to npm and pushed the `v<version>` tag.

GitHub Releases and asset uploads go through the **GitHub REST API over HTTPS** — the SSH key used for `git push` cannot create a release or upload an asset. So the behavior depends entirely on whether `GITHUB_TOKEN` is available:

```bash
[ -n "$GITHUB_TOKEN" ] && echo "token present" || echo "no token"
```

### If `GITHUB_TOKEN` is set → automated, on user confirmation (not manual)

1. **Build the release APK:**
   ```bash
   cd example/android
   ./gradlew assembleRelease
   ```
   Output: `example/android/app/build/outputs/apk/release/app-release.apk`.
   ⚠️ This requires a release signing config/keystore. If the example only has debug signing, `assembleRelease` may fail or produce an unsigned APK — in that case ask the user for the keystore, or fall back to the debug APK from step 4 (`app-debug.apk`) and tell them it is debug-signed.

2. **Ask the user to confirm before publishing** (the release is public — never publish without an explicit yes):
   > "Publish GitHub release v<version> with `app-release.apk` attached? (yes/no)"

3. **On confirmation**, create the release for the existing tag, upload the APK, and publish — in one step. Prefer `gh` if installed:
   ```bash
   gh release create v<version> \
     example/android/app/build/outputs/apk/release/app-release.apk \
     --repo adivery/adivery-react-native-plugin \
     --title "Release <version>" \
     --notes "<release notes>"
   ```
   If `gh` is NOT installed, use the REST API (two calls):
   ```bash
   # a) create the release → capture "id" from the JSON response
   curl -sS -X POST \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/adivery/adivery-react-native-plugin/releases \
     -d '{"tag_name":"v<version>","name":"Release <version>","body":"<notes>","draft":false,"prerelease":false}'

   # b) upload the APK as an asset (RELEASE_ID from step a)
   curl -sS -X POST \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Content-Type: application/vnd.android.package-archive" \
     --data-binary @example/android/app/build/outputs/apk/release/app-release.apk \
     "https://uploads.github.com/repos/adivery/adivery-react-native-plugin/releases/<RELEASE_ID>/assets?name=app-release.apk"
   ```

### If `GITHUB_TOKEN` is NOT set → fall back to the previous (manual) flow

Do not attempt an automated upload. Give the user the pre-filled web URL to open, attach the APK by drag-and-drop, and publish themselves (this is what step 6's release-it run prints when no token is present):

```
https://github.com/adivery/adivery-react-native-plugin/releases/new?tag=v<version>&title=Release+<version>
```

### Notes
- **Changelog heading**: conventional-changelog computes the *next* semver from commit types (a `feat:` commit makes it look like a minor bump), so the generated notes can show a higher version than what you published. Edit the heading to `<version>` before publishing.
- **Token scope**: the create-release endpoint requires `contents=write` (confirmed via the `x-accepted-github-permissions` response header). A fine-grained `GITHUB_TOKEN` needs **Contents: Read & write** on this repo; a classic PAT needs the `public_repo` scope (the repo is public). A token pasted into chat is exposed; advise rotating it after use.
- **`adivery` org policy (important)**: the `adivery` organization **forbids fine-grained PATs whose lifetime exceeds 366 days**. A token with "No expiration" or a >1-year expiry gets **403 "Resource not accessible by personal access token"** on *every* org-repo call (even reads). If you hit that 403, the fix is to regenerate the fine-grained PAT with an **expiration ≤ 366 days**, repository access to `adivery/adivery-react-native-plugin`, and **Contents: Read & write** — then retry. (Diagnose with `curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/adivery/adivery-react-native-plugin` — the 403 body states the exact policy.)

---

## Architecture notes (for context)

- **Plugin source**: `src/index.tsx` — the only JS/TS interface users interact with
- **Plugin native**: `android/src/main/java/com/adivery/` — `AdiveryModule.kt`, `AdiveryPackage.kt`, `AdiveryBannerAdViewManager.kt`, `BannerViewGroup.kt`
- **Native events**: emitted via `RCTDeviceEventEmitter` in `handleGlobalListener()` (`AdiveryModule.kt:70`), subscribed via `NativeEventEmitter(NativeModules.AdiveryModule)` in JS
- **New arch note**: `addGlobalListener` (the old broken method with 13 Promise params) was removed. It violated TurboModule rules and caused `ParsingException: Promises must be used as last parameter only` on RN new arch.
- **RN version**: example app uses 0.85.3 with `newArchEnabled=true` and `hermesEnabled=true`
- **Gradle**: 9.3.1 (required by `@react-native/gradle-plugin`), AGP 8.7.2, Kotlin 2.0.21, JVM 17
