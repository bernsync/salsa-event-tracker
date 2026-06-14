# iOS Deployment Checklist

## Current Working Release Path

This Mac can archive and upload directly with `xcodebuild`.

Current known-good app metadata:

- bundle id: `com.salsaeventtracker.ios`
- team id: `MG3K52T7N9`
- marketing version: `1.0`
- current build: 2

## Release Files

- export options plist: `ios/ExportOptions-AppStore.plist`
- project file: `ios/SalsaEventTracker.xcodeproj/project.pbxproj`
- xcodegen spec: `ios/project.yml`
- required build history: `docs/ios-build-changelog.md`

## Required Shipping Documentation

Before every upload, add an entry to `docs/ios-build-changelog.md` for the exact build number being uploaded.

The entry must include:

- build number and date
- branch name
- upload status
- user-visible changes
- technical/behavioral changes that affect testing
- validation commands and results
- known risks or follow-up testing

Do not archive or upload an undocumented build.

## Minimal Upload Flow

1. Confirm branch and working tree:

```bash
git branch --show-current
git status --short
```

2. Confirm version/build:

```bash
grep -n "CURRENT_PROJECT_VERSION\|MARKETING_VERSION" ios/SalsaEventTracker.xcodeproj/project.pbxproj
```

3. Build a simulator sanity check:

```bash
xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -sdk iphonesimulator -configuration Debug build
```

4. Confirm build changelog entry exists:

```bash
grep "Build <build-number>" docs/ios-build-changelog.md
```

5. Archive for iPhoneOS:

```bash
xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -configuration Release -destination generic/platform=iOS -archivePath /private/tmp/SalsaEventTracker-upload.xcarchive -allowProvisioningUpdates archive
```

6. Export and upload to App Store Connect:

```bash
xcodebuild -exportArchive -archivePath /private/tmp/SalsaEventTracker-upload.xcarchive -exportPath /private/tmp/SalsaEventTracker-upload -exportOptionsPlist /Users/noamberns/Documents/GitHub/salsa-event-tracker/ios/ExportOptions-AppStore.plist -allowProvisioningUpdates
```

7. Wait for the success line:

```text
Upload succeeded.
Uploaded SalsaEventTracker
** EXPORT SUCCEEDED **
```

## Build Bump

Version management lives in `ios/project.yml`. After editing, regenerate the Xcode project:

```bash
xcodegen generate --spec ios/project.yml
```

Current release convention:

- `MARKETING_VERSION` stays on the product version, e.g. `1.0`
- `CURRENT_PROJECT_VERSION` increments with every upload

Quick check after regenerating:

```bash
grep -n "CURRENT_PROJECT_VERSION\|MARKETING_VERSION" ios/SalsaEventTracker.xcodeproj/project.pbxproj
```

## Export Notes

- The archive may show `Apple Development` signing in the archive metadata.
- The export/upload step can still succeed with `signingStyle = automatic` and `method = app-store-connect`.
- The actual truth is whether `xcodebuild -exportArchive` reaches `Upload succeeded`.

## If Upload Fails

Check these first:

1. Xcode account is still signed in.
2. Team is still `MG3K52T7N9`.
3. Bundle id is still `com.salsaeventtracker.ios`.
4. Build number was incremented.
5. `ExportOptions-AppStore.plist` still uses:
   - `destination = upload`
   - `method = app-store-connect`
   - `signingStyle = automatic`

## App Store Connect Follow-Through

After upload:

1. Open App Store Connect.
2. Wait for build processing to complete.
3. Add release notes if needed.
4. Push to internal or external TestFlight as appropriate.

## Very Short Version

```bash
xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -configuration Release -destination generic/platform=iOS -archivePath /private/tmp/SalsaEventTracker-upload.xcarchive -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath /private/tmp/SalsaEventTracker-upload.xcarchive -exportPath /private/tmp/SalsaEventTracker-upload -exportOptionsPlist /Users/noamberns/Documents/GitHub/salsa-event-tracker/ios/ExportOptions-AppStore.plist -allowProvisioningUpdates
```
