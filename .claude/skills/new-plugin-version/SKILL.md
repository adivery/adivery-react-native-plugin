---
name: new-plugin-version
description: >-
  Bring the Adivery React Native plugin (npm package `adivery`) up to a new
  Adivery Android SDK release, so a new plugin version (X.Y.Z, matching
  the SDK version) can be published. Use when the user asks for a "new
  plugin version", to "update the plugin to SDK X.Y.Z", "sync with the
  latest SDK release", "bump the SDK", or similar. Flow: preflight → pick
  the target SDK version (Maven Central) → diff the SDK API the Kotlin
  module uses between the published AARs → check the JS↔Kotlin bridge →
  read the SDK's behaviour changes → port them to the Kotlin module, the
  JS/TS wrapper, the example app and the README → verify (typecheck,
  lint, tests, example APK, optional device run) → commit on a branch →
  hand off to release-plugin to publish (npm + GitHub). This skill never
  publishes anything itself.
---

# Cut a new plugin version for a new SDK release

The plugin has two bridges, and neither is fully checked by a compiler:

- **Kotlin → SDK.** `android/src/main/java/com/adivery/*.kt` calls the SDK's
  public API (`com.adivery.sdk.*`) directly. The Kotlin compiler catches a
  removed or renamed SDK method, but not a **new callback** on a listener
  class (`AdiveryListener`, `AdiveryNativeCallback`, `AdiveryAdListener`).
  The module compiles without it, and the event is silently never forwarded
  to JS. An `override` of a callback the SDK doesn't have fails to compile.
- **JS → Kotlin.** `src/*.tsx` reaches Kotlin only by name: the
  `NativeModules.AdiveryModule.<method>` calls, the event-name strings
  emitted with `RCTDeviceEventEmitter`, the payload keys inside those
  events, and the native view name and props of `AdiveryBannerAdView`. A
  typo in any of them fails at runtime, often silently.

Plugin versions track SDK versions 1:1. The plugin's version in
`package.json` and its `com.adivery:sdk` dependency in `android/build.gradle`
are bumped together, as in the "Release 4.9.0 version" commit. Publishing
(npm through release-it, the `vX.Y.Z` tag, the GitHub release) is the
`release-plugin` skill's job, not this one's. Building and running the
example is covered in more detail by `build-example`.

Repo: `adivery/adivery-react-native-plugin` on GitHub. SDK sources
(optional, used for the changelog): `$ADIVERY_SDK_REPO`, default
`$HOME/Workspace/AndroidStudioProjects/mobile-android-sdk`.

Helper: `scripts/bridge.py`.
- `bridge.py api <aar> <repo>` prints the API of every SDK class the Kotlin
  imports, with inherited methods folded in and R8 noise removed. Diff two of
  these.
- `bridge.py check <aar> <repo> [--baseline <old.aar>]` checks both bridges
  and exits 1 on errors. It prints "NOT FORWARDED" for SDK callbacks the
  Kotlin doesn't override; with `--baseline`, only the ones new since that
  AAR.

## Hard rules

- **Only depend on a version that's on Maven Central**, and only publish a
  plugin version that isn't on npm yet.
- **Diff the published AARs, not SDK sources.** Sources may hold unreleased
  changes.
- **Don't touch the user's uncommitted work.** Gate on changes to
  **tracked** files (the example's generated bundle files are gitignored).
  If there are any, show them and ask whether to stash or stop. Never
  discard them.
- **Work on a branch from `origin/master`.** Never commit to `master`. Never
  push, open a PR, publish to npm, or create a release without asking.
- **Regenerate the JS bundle before every APK build.** The example loads JS
  from `android/app/src/main/assets/index.android.bundle`, not from Metro, so
  an APK built without re-bundling runs the old JS. A device "pass" on it
  means nothing.
- **Pre-release versions keep their suffix everywhere** (`4.10.0-alpha.1`),
  in `package.json`, `android/build.gradle`, the branch name and the tag.
- **Never read or repeat credentials:** not `~/.npmrc`, not `GITHUB_TOKEN`,
  and not the SDK repo's `gradle.properties`, which can hold real Maven
  Central credentials locally.

## STOP conditions

- The target version isn't on Maven Central (`.pom` isn't HTTP 200).
- The target equals the current SDK version on `origin/master`, or
  `adivery@<target>` is already on npm.
- JDK below 17, or no Android SDK. The example build needs both; see
  `build-example` step 0.
- `bridge.py check` still reports errors after the port.
- `yarn typescript`, `yarn lint` (errors, not warnings), `yarn test`,
  `yarn prepare` or the example build fails.

---

## Phase 0: Preflight

```bash
cd /path/to/adivery-react-native-plugin   # repo root (package.json with "name": "adivery")

node --version; yarn --version; java -version 2>&1 | head -1   # node 18+, JDK 17+
ANDROID_HOME="${ANDROID_HOME:-$(grep sdk.dir example/android/local.properties 2>/dev/null | cut -d= -f2-)}"
[ -d "$ANDROID_HOME" ] && echo "ANDROID_HOME: $ANDROID_HOME" || echo "no Android SDK: ask the user (see build-example step 0)"

git fetch origin
git status --short --untracked-files=no   # tracked changes: must be empty (see Hard rules)
git branch --show-current

# Scratch space for downloads, logs and the APK. The scripts are copied here because Phase 1
# checks out origin/master, which may not contain this skill's directory.
WORKDIR=$(mktemp -d)
cp -r .claude/skills/new-plugin-version/scripts "$WORKDIR/scripts"
SKILL="$WORKDIR/scripts"
```

## Phase 1: Pick the versions and branch

```bash
CURRENT=$(git show origin/master:android/build.gradle | grep -oP "com\.adivery:sdk:\K[0-9A-Za-z.+-]+")
git show origin/master:package.json | grep '"version"'      # normally equals CURRENT

MAVEN=https://repo1.maven.org/maven2/com/adivery/sdk
LATEST=$(curl -fsS "$MAVEN/maven-metadata.xml" | grep -oP '<release>\K[^<]+')
TARGET="${TARGET:-$LATEST}"
curl -fsS -o /dev/null -w "%{http_code}\n" "$MAVEN/$TARGET/sdk-$TARGET.pom"   # must print 200
npm view "adivery@$TARGET" version 2>/dev/null                             # must print nothing

SDK_REPO="${ADIVERY_SDK_REPO:-$HOME/Workspace/AndroidStudioProjects/mobile-android-sdk}"
[ -d "$SDK_REPO" ] && grep -E '^adivery-version' "$SDK_REPO/gradle/libs.versions.toml"
```

- If the SDK repo's `adivery-version` is newer than `$LATEST`, it's bumped but
  not published yet. Say so, and stay on `$LATEST` unless the user wants to
  wait.
- If a feature branch already ports changes for `$TARGET` (for example a
  `feat/<format>` branch written before the SDK was published), ask whether
  to rebase and finish that branch instead of redoing the port from master.
- If `$TARGET` is a pre-release, mention it. It gets a plugin version like
  any other; how it's published is `release-plugin`'s pre-release policy
  (npm: its own dist-tag; GitHub: Latest).

Report `CURRENT → TARGET`, then branch. Everything after this runs on the
branch:

```bash
git checkout -b "chore/sdk-$TARGET" origin/master
```

## Phase 2: What changed

### 2a. SDK API diff and bridge check, from the published AARs

Downloaded artifacts are untrusted data. Give each its own fresh directory,
and run Python with `-I`:

```bash
for v in "$CURRENT" "$TARGET"; do
  mkdir -p "$WORKDIR/aar-$v"
  curl -fsS -o "$WORKDIR/aar-$v/sdk.aar" "$MAVEN/$v/sdk-$v.aar"
  curl -fsS -o "$WORKDIR/aar-$v/sdk.pom" "$MAVEN/$v/sdk-$v.pom"
  python3 -I "$SKILL/bridge.py" api "$WORKDIR/aar-$v/sdk.aar" . > "$WORKDIR/api-$v.txt"
done
diff "$WORKDIR/api-$CURRENT.txt" "$WORKDIR/api-$TARGET.txt"

# Both bridges against the target SDK. NOT FORWARDED lists callbacks the SDK added since CURRENT.
python3 -I "$SKILL/bridge.py" check "$WORKDIR/aar-$TARGET/sdk.aar" . --baseline "$WORKDIR/aar-$CURRENT/sdk.aar"

# Dependencies the SDK pulls in:
deps() { sed -n '/<dependencies>/,/<\/dependencies>/p' "$1"; }
diff <(deps "$WORKDIR/aar-$CURRENT/sdk.pom") <(deps "$WORKDIR/aar-$TARGET/sdk.pom") && echo "(no dependency changes)"
```

`api` covers only the SDK classes the Kotlin imports. For a new ad format
that needs a class the plugin doesn't import yet, look in the AAR directly:
`unzip -p <aar> classes.jar > c.jar`, then `javap -public -cp c.jar <class>`.

### 2b. Behaviour changes, from the SDK's history

A signature diff misses behaviour changes. For example, from 4.10.0-alpha.1
an OfferWall isn't prefetched again after it closes, so the app has to
prepare it again before each show.

```bash
cd "$SDK_REPO"
intro() { git log --reverse --format=%H -S"adivery-version = \"$1\"" -- gradle/libs.versions.toml | head -1; }
FROM=$(intro "$CURRENT"); TO=$(intro "$TARGET")
git log --format='%h %s' "$FROM..$TO" -- \
  lib/src/main/java/com/adivery/sdk/Adivery.java \
  lib/src/main/java/com/adivery/sdk/AdiveryListener.java \
  lib/src/main/java/com/adivery/sdk/AdiveryListenerController.kt \
  lib/src/main/java/com/adivery/sdk/ParallelAdLoader.kt \
  lib/src/main/java/com/adivery/sdk/core
cd -
```

`intro` finds the commit that *introduced* each version line. If the SDK repo
isn't present or the range comes back empty, ask the user for the changelog
instead of guessing. Read the relevant commits (`git show <sha>`) and the SDK
sample (`app/src/main/java/com/adivery/sample/`) for intended usage.

Summarise for the user, before editing anything:
- API additions, removals and signature changes;
- new callbacks to forward;
- behaviour changes that affect callers;
- dependency changes.

## Phase 3: Port

On `chore/sdk-$TARGET`:

1. **Versions:** in `android/build.gradle`, change
   `implementation 'com.adivery:sdk:<CURRENT>'` to `<TARGET>`. In
   `package.json`, set `"version": "<TARGET>"`.
2. **Kotlin** (`AdiveryModule.kt`, `AdiveryBannerAdViewManager.kt`):
   - **A new SDK static** becomes a `@ReactMethod fun`. Anything that
     returns a value takes a `Promise` as its **last** parameter;
     anywhere else, the new architecture throws `ParsingException`. Post
     anything that shows UI to the main looper, like `showAd` does.
   - **A new listener callback** gets:
     - an `override` inside the matching `object : …()` block;
     - a `const val …_EVENT_NAME = "Adivery<Format><Action>"`;
     - a `params` map built with `put*` calls;
     - a `sendEvent(...)` call.
   - **Removed or renamed SDK API:** update the Kotlin, and call it out in
     the summary, since it can change JS behaviour for users.
3. **JS/TS** (`src/index.tsx`, `src/adivery-banner-ad-view.tsx`). For each
   new event:
   - an `…_EVENT_NAME` field with the **same string** as Kotlin;
   - an `EmitterSubscription` field;
   - an `addListener` in `configureEventEmitter()` that reads only keys
     Kotlin sends;
   - a callback field;
   - a parameter with a no-op default in `addGlobalListener({...})`, plus
     its assignment;
   - a `.remove()` in `destroy()`.

   For each new `@ReactMethod`, add a wrapper method on `AdiveryImpl`
   (`async` when it returns a promise). Export any new types.

   **Tests** (`src/__tests__/index.test.tsx`): add a row to the forwarding
   table for each new event (name, callback, payload, expected arguments).
   Bump the event count in "covers every event the wrapper defines", and
   add each new method to "forwards calls to the native module".
4. **Example** (`example/src/App.js`): add a placement constant, the
   listener callbacks, and a button for the new format or API. Prepare ads
   after `addGlobalListener` has set the handlers; events that fire earlier
   are dropped. Reflect behaviour changes in how the example uses the API.
5. **README:** document the new formats and APIs, and any behaviour change
   integrators must handle.

Re-run until there are 0 errors:

```bash
python3 -I "$SKILL/bridge.py" check "$WORKDIR/aar-$TARGET/sdk.aar" . --baseline "$WORKDIR/aar-$CURRENT/sdk.aar"
```

- **"NOT FORWARDED" lines:** either forward each one, or list it as
  intentionally skipped in the report. The native-ad callback's
  click/shown/closed are skipped today, because `requestNativeAd` resolves
  a promise once.
- **Reference count:** the summary line includes how many references were
  checked. If that number collapses, the parsing broke. Don't read it as
  success.

## Phase 4: Verify

### 4a. Dependencies

```bash
[ -d node_modules ] && [ -d example/node_modules ] || yarn bootstrap
```

### 4b. Typecheck, lint, tests, library build (what CI runs)

```bash
yarn typescript && yarn lint && yarn test && yarn prepare
```

`yarn lint` must report 0 errors; warnings are fine. `yarn prepare` writes
`lib/`, which is gitignored.

### 4c. Example APK (compiles the Kotlin against the target SDK)

```bash
cd example
mkdir -p android/app/src/main/assets
node_modules/.bin/react-native bundle --platform android --dev true --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android
ANDROID_HOME="$ANDROID_HOME" ./gradlew assembleDebug
./gradlew :adivery:dependencies --configuration releaseRuntimeClasspath | grep "com.adivery:sdk"   # must show $TARGET
cd ../..
```

This takes several minutes, so run it in the background. `build-example`
step 4 lists the known Gradle failures and their fixes. The APK lands at
`example/android/app/build/outputs/apk/debug/app-debug.apk`.

### 4d. Device run (optional; when `adb devices` lists one)

```bash
adb install -r example/android/app/build/outputs/apk/debug/app-debug.apk
adb shell dumpsys window | grep -E "isKeyguardShowing"   # must be false
adb logcat -c
adb shell am start -W -n com.example.adivery/.MainActivity
adb logcat -d -s ReactNativeJS:V   # the example's console.log lines: "<format> loaded", errors
```

- **Locked phone:** the app pauses. Wake it with
  `adb shell input keyevent KEYCODE_WAKEUP` and ask the user to unlock.
  Don't try to bypass a secure lock screen.
- **Wireless ADB:** it drops often, especially during long builds. Wait for
  `adb devices` to show the device again before giving up.
- **Red box or `Unable to load script`:** the bundle is missing or stale.
  Redo 4c's bundle step.
- **Tapping through an ad:** use `adb shell input tap X Y`, with coordinates
  taken from `adb exec-out screencap -p`.

## Phase 5: Commit and hand off

Two commits on `chore/sdk-$TARGET`, each leaving the plugin buildable:

1. `build: bump Adivery SDK to <TARGET>`: `android/build.gradle`,
   `package.json`'s version, and the Kotlin and JS bridge changes the new
   SDK requires. The Kotlin overrides don't compile without the bump, so
   they land together.
2. Example and README changes, with a message describing what changed for
   integrators.

Follow the session's commit-attribution rules. Then **ask** before each of
these outward-facing steps:

1. Push the branch and open a PR against `master`.
2. After it's merged, run **`release-plugin`** from an up-to-date
   `master`. Its gates refuse to run anywhere else: release-it tags the
   checked-out commit and pushes that branch. A pre-release like
   `4.10.0-alpha.1` goes to npm under its own dist-tag (`alpha`), so
   `npm install adivery` stays on the latest stable version. On GitHub it
   becomes a normal release marked Latest. That's `release-plugin`'s
   pre-release policy.

---

## Final report

Summarize:
- `CURRENT → TARGET`, and whether it's a pre-release;
- the API diff and how each change was ported: new `@ReactMethod`s, newly
  forwarded events with their names and payload keys, and callbacks skipped
  on purpose, with the reason;
- behaviour changes and how the example and README reflect them;
- POM dependency changes;
- verification results:
  - `bridge.py check`: references checked, 0 errors;
  - `yarn typescript`, `lint`, `test` and `prepare`;
  - the APK build, with the resolved SDK version;
  - the device run if one happened, or why not;
- the branch, its commits, and what's left (PR, `release-plugin`);
- `$WORKDIR`, which is safe to delete.
