# 📱 Mobile App Setup Guide

## ✅ Capacitor is Now Installed!

Your app is ready to become a mobile application. Follow these steps to build and install it on your phone.

---

## 🚀 Quick Start (5 Steps)

### Step 1: Export to GitHub
1. Click **"GitHub"** button (top right in Lovable)
2. Click **"Connect to GitHub"** or **"Export to GitHub"**
3. Authorize Lovable GitHub App
4. Create new repository

### Step 2: Clone to Your Computer
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

### Step 3: Add Mobile Platforms
```bash
# For Android
npx cap add android

# For iOS (Mac only)
npx cap add ios
```

### Step 4: Build Your App
```bash
npm run build
npx cap sync
```

### Step 5: Run on Device/Emulator

**For Android:**
```bash
npx cap run android
```

**For iOS (Mac with Xcode only):**
```bash
npx cap run ios
```

---

## 📲 Install on Physical Device

### Android (Easiest Method):

1. **Enable Developer Mode** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"

2. **Connect phone to computer** via USB

3. **Run the app:**
   ```bash
   npx cap run android
   ```
   - Select your device from the list
   - App installs automatically!

### iOS (Requires Mac + Apple Developer Account):

1. **Requirements:**
   - Mac computer with Xcode installed
   - Apple Developer account ($99/year)
   - iPhone/iPad connected via USB

2. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```

3. **Sign the app:**
   - Click project name in Xcode
   - Select your team under "Signing & Capabilities"
   - Connect iPhone
   - Click Run button (▶️)

---

## 🔧 Requirements

### For Android Development:
- **Android Studio** ([Download](https://developer.android.com/studio))
- **Java JDK 17+** (comes with Android Studio)
- **Android device** or emulator

### For iOS Development:
- **Mac computer** (required)
- **Xcode** from Mac App Store
- **Apple Developer Account** ($99/year)
- **iPhone/iPad**

---

## 📦 Build APK for Distribution (Android)

### Method 1: Debug APK (Quick, No Signing)
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Share this file** via WhatsApp, email, Google Drive, etc.

### Method 2: Release APK (For Play Store)
```bash
cd android
./gradlew assembleRelease
```

---

## 🎯 Testing on Your Phone NOW

### Fastest Way (Android):

1. **Export to GitHub** (button in Lovable)
2. **Open Terminal** on your computer
3. **Run these commands:**
   ```bash
   git clone YOUR_GITHUB_URL
   cd YOUR_REPO_NAME
   npm install
   npx cap add android
   npm run build
   npx cap sync
   npx cap run android
   ```
4. **Select your phone** from the device list
5. **App installs!** 🎉

---

## 🌐 Live Testing (No Build Required)

Your app works on mobile browsers NOW:
- Open on phone: `https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com`
- Add to Home Screen (works like an app!)

**iOS:**
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"

**Android:**
1. Open in Chrome
2. Menu → "Add to Home Screen"

---

## 📝 Build Commands Reference

```bash
# Install dependencies
npm install

# Add platforms (only needed once)
npx cap add android
npx cap add ios

# Build web app
npm run build

# Sync changes to native projects
npx cap sync

# Open in IDE
npx cap open android
npx cap open ios

# Run on device
npx cap run android
npx cap run ios

# Update native dependencies
npx cap update android
npx cap update ios
```

---

## 🎨 App Configuration

Edit `capacitor.config.ts` to customize:
- App name
- App ID (package name)
- Splash screen
- Icons
- Permissions

### 🔔 Push Notifications Setup

Your app now includes push notification support! To enable notifications:

1. **In the app:** Click the bell icon in the top navigation
2. **Grant permission:** Accept when prompted to enable notifications
3. **That's it!** You'll now receive:
   - New message notifications with sound
   - Activity notifications (likes, comments, follows)
   - Event reminders

**For native mobile apps:**
After adding push notifications, make sure to:
```bash
npm run build
npx cap sync
```

This syncs the notification plugin to your native projects.

---

## 🚀 Publishing

### Google Play Store (Android):
1. Create Google Play Developer account ($25 one-time)
2. Build signed release APK
3. Upload to Play Console
4. Review takes 1-3 days

### Apple App Store (iOS):
1. Apple Developer Program ($99/year)
2. Create App Store listing
3. Submit via Xcode
4. Review takes 1-7 days

---

## ❓ Common Issues

**"Android SDK not found"**
- Install Android Studio
- Open Android Studio → SDK Manager
- Install Android SDK

**"Unable to locate adb"**
- Add Android SDK to PATH
- Restart terminal

**"Device not detected"**
- Enable USB Debugging
- Allow USB Debugging popup on phone
- Try different USB cable

**"Build failed"**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Run `npx cap sync`

---

## 📚 More Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Development Guide](https://developer.android.com/guide)
- [iOS Development Guide](https://developer.apple.com/documentation/)
- [Lovable Mobile Blog Post](https://lovable.dev/blogs/TODO)

---

## 💡 Quick Summary

**To get app on your phone:**

1. Click GitHub button → Export
2. Clone repo locally
3. Run: `npm install`
4. Run: `npx cap add android` (or ios)
5. Run: `npm run build && npx cap sync`
6. Run: `npx cap run android` (connect phone via USB)

**That's it!** Your app installs on your phone! 🎉
