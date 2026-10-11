---
name: release-plugin
description: >-
  Publish a new version of the Adivery React Native plugin: npm (through
  release-it), the vX.Y.Z git tag, and the GitHub release with the example
  APK attached. Use only when the user explicitly asks to "release",
  "publish" or "cut" a plugin version. Every step is outward-facing, so it
  runs hard preflight gates first (up-to-date master, clean tree, checks
  passing, version consistent and not yet published), dry-runs, and asks
  before publishing. For building and running the example, see
  build-example. For bringing the plugin up to a new SDK release before
  this, see new-plugin-version.
---

# Release the plugin

The project publishes with `release-it` (configured in `package.json` under
`"release-it"`): conventional-changelog, `npm publish`, the git tag
`v${version}`, and optionally a GitHub release. This skill publishes the
version that's already committed in `package.json`; it never bumps it. A
version bump comes from `new-plugin-version`, or from a "Release X.Y.Z
version" commit.

Plugin versions track Adivery SDK versions 1:1. `package.json`'s `version`
equals the `com.adivery:sdk` version in `android/build.gradle`.

## Pre-release policy (decided)

For versions like `4.10.0-alpha.1` or `4.10.0-beta.2`:
- **npm: a separate dist-tag.** The version is published under the
  pre-release id (`alpha`, `beta`), so `npm install adivery` stays on the
  latest stable version. That's release-it's default, so don't override
  it. Confirm `--tag alpha` (or `beta`) in the dry-run output.
- **GitHub: a normal release, marked Latest**, like stable versions.

## Preflight gates (STOP and report if any fails)

Read `package.json` and `android/build.gradle` with the Read tool, not
through shell output. A filtering shell proxy can reformat values, and an
amended commit can shift what's in the tree.

```bash
cd /path/to/adivery-react-native-plugin   # repo root (package.json with "name": "adivery")

# 1. On master, in sync with origin. release-it tags the checked-out commit and pushes the
#    current branch, so a release from anywhere else tags the wrong commit.
git fetch origin
[ "$(git branch --show-current)" = master ] || echo "STOP: not on master"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] || echo "STOP: master isn't in sync with origin/master"

# 2. No changes to tracked files.
[ -z "$(git status --short --untracked-files=no)" ] || echo "STOP: uncommitted changes to tracked files"

# 3. The plugin version equals the SDK version, that SDK is on Maven Central, and the plugin
#    version isn't on npm yet.
VERSION=$(node -p "require('./package.json').version")
SDK=$(grep -oP "com\.adivery:sdk:\K[0-9A-Za-z.+-]+" android/build.gradle)
[ "$VERSION" = "$SDK" ] || echo "STOP: package.json $VERSION != android/build.gradle com.adivery:sdk:$SDK"
curl -fsS -o /dev/null "https://repo1.maven.org/maven2/com/adivery/sdk/$SDK/sdk-$SDK.pom" \
  || echo "STOP: com.adivery:sdk:$SDK isn't on Maven Central"
[ -z "$(npm view "adivery@$VERSION" version 2>/dev/null)" ] || echo "STOP: adivery@$VERSION is already on npm"
case "$VERSION" in *-*) echo "pre-release: npm dist-tag ${VERSION#*-}" | sed 's/\.[0-9]*$//' ;; *) echo "stable: npm dist-tag latest" ;; esac

# 4. Checks (the same ones CI runs) and an up-to-date lib/.
yarn typescript && yarn lint && yarn test && yarn prepare || echo "STOP: checks failed"
```

Recommended as well: build the example with `build-example` (steps 3–4). It
compiles the Kotlin against the pinned SDK, and step 7 below needs an APK
anyway.

Report the version, the dist-tag it will get, and the gate results before
going on.

## 6. Publish to npm (and tag) with release-it

### Authentication
- You need to be logged in to npm (`npm whoami` prints the user), or have
  an automation token in `~/.npmrc`. Automation tokens may get a 401 on
  `whoami` and still publish.
- If neither is set up, tell the user: "You need to authenticate with npm.
  Run `npm login` in your terminal (type `! npm login` in this chat) and
  follow the prompts."

### The command

The release commit already bumped `package.json`. The working tree may have
untracked example build artifacts, and the repo's tag history is sparse. The
invocation that works under those conditions:

```bash
# --no-increment                    the version is already set and committed
# --no-git.commit                   the release commit already exists; don't make an empty one
# --no-git.requireCleanWorkingDir   tolerate untracked example build artifacts
# --ci                              non-interactive (no TTY in this harness)
node_modules/.bin/release-it --no-increment --no-git.commit --no-git.requireCleanWorkingDir --ci
```

- Use the `--no-git.requireCleanWorkingDir` form. `--git.requireCleanWorkingDir=false`
  does **not** disable the check.
- **Always dry-run first:** append `--dry-run` and show the user the
  sequence, including the `npm publish` dist-tag. Ask for an explicit yes
  before the real run.
- **release-it's order is npm publish → git tag → git push → GitHub
  release.**
  - A failure **at or before npm publish** is safe to retry; the version
    isn't live yet.
  - A failure **after npm publish** means the version **is** live. Don't
    re-run release-it (it would get a 403 "version exists"); finish the
    tag, push and GitHub release by hand.

### GitHub release: depends on whether `GITHUB_TOKEN` is set
- **`GITHUB_TOKEN` is set:** add `--no-github.release`, so release-it does
  npm, the tag and the push only. Step 7 then creates the GitHub release
  with the APK attached, after the user confirms.
  ```bash
  node_modules/.bin/release-it --no-increment --no-git.commit --no-git.requireCleanWorkingDir --no-github.release --ci
  ```
- **`GITHUB_TOKEN` is not set:** run the command without
  `--no-github.release`. With no token, release-it prints a pre-filled web
  URL for a manual GitHub release; npm, the tag and the push still happen.
  For a pre-release version that form opens with **"Set as a pre-release"
  ticked**. Per the policy above, tell the user to untick it and tick "Set
  as the latest release" before publishing.

### If npm requires 2FA or an OTP
If npm rejects with `E403 Two-factor authentication required` or `EOTP`, ask
the user for their OTP and retry. A failed publish is harmless.

```bash
node_modules/.bin/release-it --no-increment --no-git.commit --no-git.requireCleanWorkingDir --ci --npm.publishArgs="--otp=<OTP>"
```

Alternatively, a Granular Access Token with the "bypass 2FA" option needs no
OTP.

### Verify (with the Read tool or a raw shell, not a filtering proxy)
```bash
npm view adivery version dist-tags          # stable: latest == VERSION; pre-release: <preid> == VERSION
git ls-remote origin "refs/tags/v$VERSION"  # tag pushed
```

### Fallback: plain `npm publish` (only if release-it itself is broken)
```bash
npm publish                     # stable
npm publish --tag alpha         # pre-release: the --tag is required, or it becomes "latest"
```

An `E404 Not Found` for a previously published package usually means you're
not authenticated. Check `~/.npmrc` for a valid `_authToken`, without
printing it.

**Security:** never print the contents of `~/.npmrc` or `$GITHUB_TOKEN`. If
an npm or GitHub token shows up in output, tell the user to revoke it
(npmjs.com → Access Tokens; GitHub → Developer settings → Personal access
tokens).

## 7. Create the GitHub release with the example APK

Run this **after** step 6 has published to npm and pushed the `v$VERSION`
tag, and only when `GITHUB_TOKEN` is set. Without a token, step 6's web URL
is the path. GitHub releases and asset uploads go through the REST API over
HTTPS; the SSH key used for `git push` can't create them.

1. **Build the release APK:**
   ```bash
   cd example/android && ./gradlew assembleRelease
   ```
   Output: `example/android/app/build/outputs/apk/release/app-release.apk`.
   It needs a release signing config. The example only has debug signing,
   so `assembleRelease` may fail or produce an unsigned APK. In that case,
   ask the user for the keystore, or attach the debug APK from
   `build-example` step 4 (`app-debug.apk`) and say it's debug-signed.

2. **Ask before publishing:** the release is public, so never publish
   without an explicit yes. "Publish GitHub release v<version> with
   `<apk>` attached? (yes/no)"

3. **On confirmation**, create the release for the existing tag, upload the
   APK and publish it as Latest (for pre-releases too, per the policy):
   ```bash
   gh release create "v$VERSION" example/android/app/build/outputs/apk/release/app-release.apk \
     --repo adivery/adivery-react-native-plugin \
     --verify-tag --latest \
     --title "Release $VERSION" \
     --notes "<release notes>"
   ```
   If `gh` isn't installed, use the REST API:
   ```bash
   # a) create the release, and take "id" from the JSON response
   curl -sS -X POST \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/adivery/adivery-react-native-plugin/releases \
     -d '{"tag_name":"v<version>","name":"Release <version>","body":"<notes>","draft":false,"prerelease":false,"make_latest":"true"}'

   # b) upload the APK as an asset (RELEASE_ID from step a)
   curl -sS -X POST \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Content-Type: application/vnd.android.package-archive" \
     --data-binary @example/android/app/build/outputs/apk/release/app-release.apk \
     "https://uploads.github.com/repos/adivery/adivery-react-native-plugin/releases/<RELEASE_ID>/assets?name=app-release.apk"
   ```

### Notes
- **Changelog heading:** conventional-changelog computes the *next* semver
  from commit types (a `feat:` commit looks like a minor bump), so the
  generated notes can show a higher version than the one published. Edit
  the heading to `<version>` before publishing.
- **Token scope:** creating a release needs `contents=write`. A
  fine-grained `GITHUB_TOKEN` needs **Contents: Read & write** on this repo;
  a classic PAT needs the `public_repo` scope. A token pasted into chat is
  exposed, so advise rotating it after use.
- **`adivery` org policy (important):** the `adivery` organization forbids
  fine-grained PATs that live longer than 366 days. A token with "No
  expiration" or a longer expiry gets **403 "Resource not accessible by
  personal access token"** on every call to an org repo, even reads.
  - **Fix:** regenerate the fine-grained PAT with an expiration of 366
    days or less, repository access to
    `adivery/adivery-react-native-plugin`, and **Contents: Read & write**.
    Then retry.
  - **Diagnose:** `curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/repos/adivery/adivery-react-native-plugin`.
    The 403 body states the exact policy.
