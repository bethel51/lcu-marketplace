# Release Readiness Checklist

To get your app "perfect" for the Google Play Store, I've implemented the core technical requirements. Below are the final manual steps you need to complete.

## 1. App Signing
I have added a `signingConfigs` block to your `app/build.gradle`. You must now:
- Generate a release keystore file.
- Place it in `android/app/` (or update the path in `build.gradle`).
- Update the `storePassword`, `keyAlias`, and `keyPassword` in `app/build.gradle` with your actual credentials.
- **Tip**: For better security, use environment variables or a `keystore.properties` file instead of hardcoding passwords.

## 2. Google Services
Your build script is ready to use Firebase, but `google-services.json` is missing.
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Create a project and add an Android app with package name `lcumarketplace.app`.
- Download `google-services.json` and place it in `android/app/`.

## 3. App Versioning
Currently, your `versionCode` is `1` and `versionName` is `"1.0"`.
- Remember to increment `versionCode` for every new release you upload to the Play Store.

## 4. Icons and Assets
- Ensure your icons in `res/mipmap-*` are correct and follow the [Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive) guidelines.
- I've enabled `shrinkResources`, which will remove any unused assets, keeping your APK/AAB size small.

## 5. Build Finalization
If you encounter "Unable to delete directory" errors:
- Close Android Studio.
- Run `./gradlew --stop` to kill any hanging Gradle processes.
- Delete the `build` folders manually if needed.
- Build the **Android App Bundle (AAB)** for the Play Store using:
  ```bash
  ./gradlew bundleRelease
  ```

---
**Changes Made:**
- ✅ Enabled R8 optimizations (fixed `proguard-android.txt` issue).
- ✅ Enabled `minifyEnabled` and `shrinkResources` for production.
- ✅ Updated Splash Screen to the modern `androidx.core:core-splashscreen` API.
- ✅ Enabled native **Edge-to-Edge** support for a premium feel.
- ✅ Added a signing configuration template.
