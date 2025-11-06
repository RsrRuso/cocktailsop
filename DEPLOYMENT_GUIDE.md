# 🚀 Complete Store Deployment Guide

This comprehensive guide covers deploying your SpecVerse Reborn app to both Google Play Store and Apple App Store.

## Table of Contents
1. [PWA Setup](#1-pwa-progressive-web-app)
2. [Android - Google Play Store](#2-android---google-play-store)
3. [iOS - Apple App Store](#3-ios---apple-app-store)
4. [Common Issues](#common-issues)

---

## 1. PWA (Progressive Web App)

Your app is already a PWA! Users can install it directly from the browser.

**How users install:**
- **Android Chrome**: Menu → "Add to Home Screen" or "Install app"
- **iOS Safari**: Share button → "Add to Home Screen"

**Features:**
- ✅ Offline support (service worker)
- ✅ App manifest with icons
- ✅ Fast loading with caching
- ✅ Works on all devices

**Live URL:** `https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com`

---

## 2. Android - Google Play Store

### Prerequisites
- ✅ Android Studio installed ([Download](https://developer.android.com/studio))
- ✅ Java JDK 11 or higher
- ✅ Physical Android device or emulator
- ✅ Google Play Console account ($25 one-time registration fee)

---

### Step 1: Setup Project Locally

1. **Export project to GitHub**
   - Click "GitHub" button in Lovable (top right)
   - Copy the repository URL

2. **Clone and install dependencies**
```bash
git clone <your-repo-url>
cd spec-verse-reborn
npm install
```

---

### Step 2: Add Android Platform

```bash
# Add Android platform
npx cap add android

# Update platform dependencies
npx cap update android
```

---

### Step 3: Configure Android Project

1. **Verify `capacitor.config.ts` configuration**
```typescript
{
  appId: 'com.specverse.app',  // Change to your unique package name
  appName: 'SpecVerse',
  webDir: 'dist',
  server: {
    url: 'https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
}
```

2. **Update package name** (if needed)
   - Open `android/app/build.gradle`
   - Change `applicationId` to match your package name

---

### Step 4: Build and Test

```bash
# Build the web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Test on device/emulator
npx cap run android
```

---

### Step 5: Generate Signing Key

**⚠️ CRITICAL: Save this information securely! You cannot recover it.**

```bash
# Generate keystore (replace with your details)
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS!)
# - Key password (SAVE THIS!)
# - Your name, organization, city, state, country
```

**Save these details:**
- Keystore file location
- Keystore password
- Key alias
- Key password

---

### Step 6: Configure Signing in Android Studio

1. **Open Android Studio**
```bash
npx cap open android
```

2. **Configure signing**
   - Go to `Build` > `Generate Signed Bundle / APK`
   - Select `Android App Bundle (AAB)`
   - Click `Next`
   - Either create new keystore or choose existing one
   - Enter keystore path, passwords, and key alias
   - Click `Next`

3. **Build settings**
   - Select `release` build variant
   - Check both signature versions (V1 and V2)
   - Click `Finish`

4. **Wait for build** - AAB will be generated in `android/app/release/`

---

### Step 7: Create Google Play Console Account

1. **Sign up at [Google Play Console](https://play.google.com/console)**
2. **Pay $25 registration fee** (one-time)
3. **Complete account verification**

---

### Step 8: Create App in Play Console

1. **Click "Create app"**
2. **Fill in details:**
   - App name: `SpecVerse`
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
3. **Declarations:**
   - Check privacy policy box
   - Check export laws compliance
4. **Click "Create app"**

---

### Step 9: Set Up Store Listing

#### Main Store Listing

1. **Go to "Main store listing"**
2. **App details:**
   - Short description (max 80 chars): "Professional network for beverage industry professionals worldwide"
   - Full description (max 4000 chars):
```
SpecVerse is the premier social network for beverage industry professionals. Connect with bartenders, sommeliers, bar managers, and mixologists worldwide.

Features:
• Share your creations through posts, reels, and stories
• Real-time messaging with industry peers
• Discover and attend industry events
• Manage your career with built-in tools
• Share and discover music
• Professional verification system
• Inventory management tools
• Recipe vault and scaling tools

Whether you're crafting cocktails, managing a venue, or exploring the beverage industry, SpecVerse helps you connect, learn, and grow.
```

3. **Required graphic assets:**
```
Icon:            512 x 512px PNG, 32-bit with alpha
Feature graphic: 1024 x 500px JPG/PNG
Screenshots:     Min 2, max 8 per device type
                 Phone: 320px - 3840px on longest side
Video (optional): YouTube URL
```

---

### Step 10: App Content

#### Privacy Policy
1. **Create a privacy policy** (required)
   - Use generator: [Privacy Policy Generator](https://app-privacy-policy-generator.firebaseapp.com/)
   - Host on your domain or GitHub Pages
   - Enter URL in Play Console

#### Content Rating
1. **Complete content rating questionnaire**
   - Go to "Content rating"
   - Select category (e.g., Social, Professional)
   - Answer all questions honestly
   - Submit for rating

#### Target Audience
1. **Select age groups** your app is designed for
2. **Declare if it appeals to children**

#### Data Safety
1. **Declare data collection practices**
   - What data you collect
   - How data is used
   - How data is shared
   - Data security practices

Example for SpecVerse:
```
✅ Account data (email, username)
✅ Photos and videos (user-generated content)
✅ Personal info (profile information)
Data usage: App functionality, Account management
Data sharing: Not shared with third parties
Security: Data encrypted in transit and at rest
```

---

### Step 11: Release

#### Internal Testing (Optional but Recommended)
1. **Go to "Internal testing"**
2. **Create new release**
3. **Upload AAB file**
4. **Add release notes**
5. **Add testers** (email addresses)
6. **Review and rollout**

#### Production Release
1. **Go to "Production"**
2. **Create new release**
3. **Upload AAB file** (from `android/app/release/`)
4. **Release notes:**
```
Initial release of SpecVerse
- Social networking for beverage professionals
- Share posts, reels, and stories
- Real-time messaging
- Career management tools
- Event creation and discovery
```
5. **Review release details**
6. **Click "Review release"**
7. **Click "Start rollout to production"**

---

### Step 12: App Review

**Timeline:** 
- Initial review: 1-3 days (can take up to 7 days)
- Updates: Usually within 24 hours

**Common rejection reasons:**
- Missing privacy policy
- Incomplete data safety section
- Low-quality screenshots
- App crashes on testing
- Target API level too low

**Status tracking:**
- Check "Publishing overview" for status
- You'll receive email updates

---

### Important Google Play Requirements

✅ **Target API Level**
- Must target Android 13 (API level 33) or higher
- Update in `android/app/build.gradle`:
```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        targetSdkVersion 34
    }
}
```

✅ **App Signing**
- Enable Google Play App Signing (recommended)
- Google manages your app signing key
- You upload with upload key

✅ **64-bit Support**
- Must include 64-bit native libraries
- Capacitor handles this automatically

✅ **Permissions**
- Declare all permissions in `AndroidManifest.xml`
- Provide justification for sensitive permissions

---

## 3. iOS - Apple App Store

### Prerequisites
- ✅ macOS computer (required - cannot develop iOS apps on Windows/Linux)
- ✅ Xcode installed ([Download from Mac App Store](https://apps.apple.com/us/app/xcode/id497799835))
- ✅ Apple Developer account ($99/year - [Sign up](https://developer.apple.com/programs/))
- ✅ iPhone or iPad for testing

---

### Step 1: Setup Project Locally

1. **Export and clone** (if not done already)
```bash
git clone <your-repo-url>
cd spec-verse-reborn
npm install
```

---

### Step 2: Add iOS Platform

```bash
# Add iOS platform
npx cap add ios

# Update platform dependencies
npx cap update ios
```

---

### Step 3: Configure iOS Project

1. **Verify `capacitor.config.ts`**
```typescript
{
  appId: 'com.specverse.app',  // Change to your unique bundle ID
  appName: 'SpecVerse',
  webDir: 'dist',
  server: {
    url: 'https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com?forceHideBadge=true',
    cleartext: true  // Remove in production
  }
}
```

---

### Step 4: Build and Sync

```bash
# Build web assets
npm run build

# Sync with iOS
npx cap sync ios
```

---

### Step 5: Open in Xcode

```bash
npx cap open ios
```

**Wait for Xcode to fully load and index the project**

---

### Step 6: Configure Signing & Capabilities

1. **Select project in Xcode** (top of file navigator)
2. **Select "App" target** (under TARGETS)
3. **Go to "Signing & Capabilities" tab**

4. **Team & Bundle ID:**
   - Automatically manage signing: ✅ Check this
   - Team: Select your Apple Developer team
   - Bundle Identifier: Change to unique ID (e.g., `com.yourcompany.specverse`)

5. **Add capabilities** (if needed):
   - Click "+ Capability"
   - Add: Push Notifications, Background Modes, etc.

---

### Step 7: Configure App Icons & Launch Screen

#### App Icons
1. **Navigate to Assets.xcassets > AppIcon**
2. **Drag and drop icons** for all required sizes:
   - 1024x1024 (App Store)
   - 180x180 (iPhone)
   - 167x167 (iPad Pro)
   - 152x152 (iPad)
   - 120x120 (iPhone)
   - 76x76 (iPad)

**Quick tip:** Use [App Icon Generator](https://appicon.co/) to create all sizes

#### Launch Screen
1. **Navigate to App > App > LaunchScreen.storyboard**
2. **Customize your splash screen**

---

### Step 8: Test on Physical Device

⚠️ **Simulator is NOT enough - must test on real device**

1. **Connect iPhone/iPad** via USB
2. **Select device** in Xcode (top bar)
3. **Click Run button** (▶️) or press `Cmd + R`
4. **On device:** Trust the developer certificate in Settings

---

### Step 9: Archive the App

1. **Select "Any iOS Device"** as build target
2. **Go to Product > Archive**
3. **Wait for build to complete**
4. **Organizer window opens** with your archive

---

### Step 10: Create App in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com/)**
2. **Click "My Apps"**
3. **Click "+" then "New App"**
4. **Fill in:**
   - Platforms: iOS
   - Name: SpecVerse
   - Primary Language: English (U.S.)
   - Bundle ID: Select the one you configured
   - SKU: Unique identifier (e.g., `SPECVERSE001`)
5. **Click "Create"**

---

### Step 11: Complete App Information

#### Pricing and Availability
1. **Set price:** Free
2. **Availability:** All countries or select specific ones

---

### Step 12: Prepare App Store Listing

#### Screenshots (required)

**iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max)
- Size: 1290 x 2796 pixels
- Min 3, max 10 screenshots

**iPhone 5.5" Display** (iPhone 8 Plus)
- Size: 1242 x 2208 pixels
- Min 3, max 10 screenshots

#### Description
```
SpecVerse is the premier social network for beverage industry professionals. Connect with bartenders, sommeliers, bar managers, and mixologists worldwide.

Features:
• Share your creations through posts, reels, and stories
• Real-time messaging with industry peers
• Discover and attend industry events
• Manage your career with built-in tools
• Share and discover music
• Professional verification system

Whether you're crafting cocktails, managing a venue, or exploring the beverage industry, SpecVerse helps you connect, learn, and grow.
```

#### Keywords (max 100 characters)
```
bartender,cocktails,mixology,sommelier,bar,hospitality,drinks,beverages
```

---

### Step 13: App Privacy

**⚠️ CRITICAL: Must be completed before submission**

1. **Go to "App Privacy"**
2. **Data Types for SpecVerse:**

   **Contact Info**
   - ✅ Email Address
   - ✅ Name
   - Purpose: Account creation, App functionality

   **User Content**
   - ✅ Photos or Videos
   - ✅ Other User Content (posts, messages)
   - Purpose: App functionality

   **Identifiers**
   - ✅ User ID
   - Purpose: App functionality

3. **Data Usage:**
   - Data Linked to User: All collected data
   - Tracking: No

---

### Step 14: Upload Build

1. **In Xcode Organizer** (after archiving)
2. **Select your archive**
3. **Click "Distribute App"**
4. **Select "App Store Connect"**
5. **Click "Upload"**
6. **Select automatic signing**
7. **Click "Upload"**
8. **Wait for processing** (10-60 minutes)

---

### Step 15: Submit for Review

1. **Select build** in App Store Connect
2. **Review checklist:**
   - ✅ Screenshots uploaded
   - ✅ Description filled
   - ✅ Privacy policy added
   - ✅ App privacy completed
   - ✅ Build selected
3. **Click "Submit to App Review"**

---

### Step 16: App Review Process

**Timeline:** 24-48 hours (can take up to 5 days)

**Common rejection reasons:**

**1. Guideline 4.2 - Minimum Functionality**
- Issue: App is just a website wrapper
- Solution: Add native features (push, camera, offline)

**2. Guideline 2.1 - App Completeness**
- Issue: Crashes or bugs
- Solution: Test thoroughly, fix all issues

**3. Guideline 5.1.1 - Privacy**
- Issue: Missing or incorrect privacy info
- Solution: Complete privacy questionnaire accurately

---

### After Approval

**Release Options:**
1. Automatic Release
2. Manual Release
3. Scheduled Release

---

## Common Issues

### "capacitor: command not found"
```bash
npm install
```

### "Android SDK not found"
- Install Android Studio
- Open SDK Manager and install Android SDK

### "No provisioning profile" (iOS)
- Sign in to Xcode with Apple ID
- Let Xcode manage signing automatically

### Build errors
```bash
rm -rf node_modules package-lock.json
npm install
npx cap sync
```

---

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/studio/publish)
- [iOS Developer Guide](https://developer.apple.com/app-store/submissions/)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## Next Steps

1. ✅ Test your PWA (already live)
2. 📱 Export to GitHub
3. 🏪 Follow Android or iOS steps above
4. 🚀 Launch to stores!

**Good luck with your launch! 🎉**