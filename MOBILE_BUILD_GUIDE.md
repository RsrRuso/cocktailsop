# LAB Cocktail SOP - Mobile Build Guide (Web/PWA/Capacitor)

⚠️ **Note**: This guide is for the **WEB-BASED** mobile app (PWA + Capacitor).  
For the **NATIVE EXPO APP**, see [EXPO_NATIVE_APP_GUIDE.md](./EXPO_NATIVE_APP_GUIDE.md)

Your LAB Cocktail SOP tool is now mobile-ready with **PWA** and **Native App** support.

## 🎯 What's Been Done

✅ **PWA Configuration**
- Updated `manifest.json` with "LAB Cocktail SOP Tool" branding
- Service worker (`public/sw.js`) configured for offline caching
- Installable on iOS and Android via "Add to Home Screen"

✅ **Native Mobile Support**
- Capacitor configured with "LAB Cocktail SOP" app name
- Ready for iOS (Xcode) and Android (Android Studio) builds
- Hot-reload enabled for development

✅ **Mobile-Responsive Design**
- Existing tool uses responsive Tailwind classes
- Touch-optimized UI components (shadcn/ui)
- Works perfectly on phone screens (portrait mode)

---

## 📱 Option 1: PWA (Progressive Web App)

### Deploy & Test PWA

1. **Deploy your app** (it's already set up for Netlify/Vercel/any static host)
   ```bash
   npm run build
   # Deploy the 'dist' folder to your hosting
   ```

2. **Test "Add to Home Screen"**
   
   **On Android (Chrome/Edge):**
   - Visit your deployed app URL
   - Tap browser menu → "Install app" or "Add to Home Screen"
   - App will appear on home screen like a native app
   
   **On iOS (Safari):**
   - Visit your deployed app URL
   - Tap Share button → "Add to Home Screen"
   - Enter name → Add
   - App will appear on home screen

3. **Offline Support**
   - Once installed, the app caches core assets
   - Works offline for basic functionality
   - User data stored in browser storage

---

## 📲 Option 2: Native App (iOS + Android)

### Prerequisites

**For Android:**
- Android Studio installed
- Java Development Kit (JDK) 17+

**For iOS:**
- macOS with Xcode installed
- Apple Developer Account (for App Store submission)

### Setup & Build

#### 1. Export Project to GitHub
- Click "Export to GitHub" in Lovable
- Clone the project locally:
  ```bash
  git clone <your-repo-url>
  cd <project-folder>
  ```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Build Web Assets
```bash
npm run build
```

#### 4. Add Mobile Platforms

**For Android:**
```bash
npx cap add android
npx cap sync android
```

**For iOS:**
```bash
npx cap add ios
npx cap sync ios
```

#### 5. Open in Native IDE

**Android Studio:**
```bash
npx cap open android
```
- In Android Studio, click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
- APK will be in `android/app/build/outputs/apk/debug/`

**Xcode (macOS only):**
```bash
npx cap open ios
```
- In Xcode, select your development team
- Click Product → Archive
- Distribute to App Store or TestFlight

#### 6. Run on Device/Emulator

**Android:**
```bash
npx cap run android
```

**iOS:**
```bash
npx cap run ios
```

---

## 🔧 Development Workflow

### Hot Reload During Development

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. The app is configured to hot-reload from your Lovable sandbox
   - Mobile app connects to: `https://f6820a39-52e7-42af-bcec-46bcaaa4573d.lovableproject.com`
   - Changes in Lovable appear instantly in the mobile app

3. To use local dev server instead, update `capacitor.config.ts`:
   ```typescript
   server: {
     url: "http://localhost:8080",
     cleartext: true
   }
   ```

### After Making Changes

```bash
npm run build
npx cap sync
```

---

## 📦 Publishing to App Stores

### Google Play Store

1. Create a **signed release APK** or **AAB**:
   - In Android Studio: Build → Generate Signed Bundle / APK
   - Follow the signing wizard
   
2. Upload to [Google Play Console](https://play.google.com/console)
   - Create app listing
   - Upload APK/AAB
   - Complete store listing (screenshots, description)
   - Submit for review

### Apple App Store

1. Create an **archive** in Xcode:
   - Product → Archive
   - Window → Organizer → Distribute App
   
2. Upload to [App Store Connect](https://appstoreconnect.apple.com)
   - Create app listing
   - Submit build for TestFlight testing
   - Submit for App Store review

---

## 🎨 Customizing Icons & Splash Screens

### App Icons

**Current icons:** Located in `public/`
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

**To update:**
1. Replace these files with your LAB logo (same sizes)
2. For native apps, also update:
   - **Android:** `android/app/src/main/res/` (various `mipmap-*` folders)
   - **iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Splash Screens

**Native splash:** Configured in `capacitor.config.ts`
- Background color: `#000000` (black)
- Duration: 2000ms

**To customize further:**
- **Android:** Edit `android/app/src/main/res/drawable/splash.png`
- **iOS:** Edit `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## 🔍 Troubleshooting

### PWA Not Installing
- Ensure app is served over HTTPS
- Check browser console for manifest/service worker errors
- Try hard refresh (Ctrl+Shift+R)

### Native Build Fails
- Run `npx cap doctor` to check setup
- Ensure all dependencies installed: `npm install`
- Clear build: `npx cap sync` then rebuild

### App Not Loading Correctly
- Check `capacitor.config.ts` has correct `webDir: 'dist'`
- Verify build folder exists: `npm run build`
- Sync again: `npx cap sync`

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA configuration (name, icons, colors) |
| `public/sw.js` | Service worker for offline caching |
| `capacitor.config.ts` | Native app configuration |
| `public/icon-*.png` | App icons for PWA/mobile |
| `src/pages/CocktailSOP.tsx` | Main LAB SOP tool page |

---

## ✅ Testing Checklist

- [ ] PWA installs on Android Chrome
- [ ] PWA installs on iOS Safari
- [ ] App works offline (basic functionality)
- [ ] All forms and buttons work on mobile
- [ ] Touch targets are comfortable
- [ ] No horizontal scrolling on phone screens
- [ ] PDF export works on mobile
- [ ] Native Android APK installs and runs
- [ ] Native iOS app builds in Xcode

---

## 🆘 Need Help?

- **PWA Issues:** Check [PWA Documentation](https://web.dev/progressive-web-apps/)
- **Capacitor Issues:** Check [Capacitor Docs](https://capacitorjs.com/docs)
- **Lovable Support:** Visit [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Your LAB Cocktail SOP tool is now mobile-ready!** 🎉

Choose PWA for quick deployment and easy updates, or build native apps for full App Store/Play Store distribution.
