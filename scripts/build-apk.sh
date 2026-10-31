#!/usr/bin/env bash
set -e

echo "=== Building Android APK for Naeem's Uni Deadlines ==="

# 1. Clean and setup workspace
APK_DIR="/tmp/apk_build"
rm -rf "$APK_DIR"
mkdir -p "$APK_DIR"/gen "$APK_DIR"/bin "$APK_DIR"/res/values "$APK_DIR"/res/mipmap-mdpi "$APK_DIR"/res/mipmap-hdpi "$APK_DIR"/res/mipmap-xhdpi "$APK_DIR"/res/mipmap-xxhdpi "$APK_DIR"/assets/www "$APK_DIR"/src/com/naeem/unideadlines

# 2. Build client dist
cd /app/applet
npm run build
cp -r dist/* "$APK_DIR"/assets/www/

# 3. Create icons in res
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-mdpi/ic_launcher.png
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-hdpi/ic_launcher.png
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-xhdpi/ic_launcher.png
cp public/pwa-512x512.png "$APK_DIR"/res/mipmap-xxhdpi/ic_launcher.png

# 4. Create strings.xml
cat << 'EOF' > "$APK_DIR"/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Uni Deadlines</string>
</resources>
EOF

# 5. Create AndroidManifest.xml
cat << 'EOF' > "$APK_DIR"/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.naeem.unideadlines"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="23" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 6. Create MainActivity.java
cat << 'EOF' > "$APK_DIR"/src/com/naeem/unideadlines/MainActivity.java
package com.naeem.unideadlines;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Load 100% offline bundled HTML/JS/CSS
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

# 7. Compile resources and Java code
ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"

echo "Generating R.java..."
aapt package -m -J "$APK_DIR"/gen -M "$APK_DIR"/AndroidManifest.xml -S "$APK_DIR"/res -I "$ANDROID_JAR"

echo "Compiling Java sources..."
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" -d "$APK_DIR"/bin "$APK_DIR"/gen/com/naeem/unideadlines/R.java "$APK_DIR"/src/com/naeem/unideadlines/MainActivity.java

echo "Dexing classes..."
dalvik-exchange --dex --output="$APK_DIR"/bin/classes.dex "$APK_DIR"/bin

echo "Packaging APK..."
aapt package -f -M "$APK_DIR"/AndroidManifest.xml -S "$APK_DIR"/res -A "$APK_DIR"/assets -I "$ANDROID_JAR" -F "$APK_DIR"/bin/app.unsigned.apk
cd "$APK_DIR"/bin
aapt add app.unsigned.apk classes.dex

echo "Generating signing key..."
if [ ! -f /tmp/debug.keystore ]; then
    keytool -genkeypair -v -keystore /tmp/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
fi

echo "Zipaligning and signing APK..."
zipalign -f -v 4 "$APK_DIR"/bin/app.unsigned.apk /app/applet/public/Naeem-Uni-Deadlines.apk
apksigner sign --ks /tmp/debug.keystore --ks-pass pass:android --key-pass pass:android /app/applet/public/Naeem-Uni-Deadlines.apk

echo "APK build complete!"
ls -lh /app/applet/public/Naeem-Uni-Deadlines.apk
