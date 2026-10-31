#!/usr/bin/env bash
set -e

echo "=== Building Android APK (API 33 / Android 13-14 Compatible) ==="

APK_DIR="/tmp/apk_build"
rm -rf "$APK_DIR"
mkdir -p "$APK_DIR"/gen "$APK_DIR"/bin "$APK_DIR"/res/values "$APK_DIR"/res/mipmap-mdpi "$APK_DIR"/res/mipmap-hdpi "$APK_DIR"/res/mipmap-xhdpi "$APK_DIR"/res/mipmap-xxhdpi "$APK_DIR"/assets/www "$APK_DIR"/src/com/mna5305/unideadlines

# 1. Build client dist
cd /app/applet
npm run build
cp -r dist/* "$APK_DIR"/assets/www/
rm -f "$APK_DIR"/assets/www/*.apk*

# 2. Setup icons
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-mdpi/ic_launcher.png
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-hdpi/ic_launcher.png
cp public/pwa-192x192.png "$APK_DIR"/res/mipmap-xhdpi/ic_launcher.png
cp public/pwa-512x512.png "$APK_DIR"/res/mipmap-xxhdpi/ic_launcher.png

# 3. Create strings.xml
cat << 'EOF' > "$APK_DIR"/res/values/strings.xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Uni Deadlines</string>
</resources>
EOF

# 4. Create AndroidManifest.xml (API 33 / Android 14 compliant)
cat << 'EOF' > "$APK_DIR"/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.mna5305.unideadlines"
    android:versionCode="2"
    android:versionName="1.0.1">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.NoTitleBar"
        android:hasCode="true"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|screenSize|uiMode"
            android:exported="true"
            android:label="@string/app_name"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 5. Create MainActivity.java
cat << 'EOF' > "$APK_DIR"/src/com/mna5305/unideadlines/MainActivity.java
package com.mna5305.unideadlines;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.View;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#f3f0ff"));
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

        // Load 100% offline bundled HTML/JS/CSS app
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

# 6. Compile resources and Java code with API 33 android.jar
ANDROID_JAR="/opt/android-sdk/platforms/android-13/android.jar"

echo "Generating R.java..."
aapt package -m -J "$APK_DIR"/gen -M "$APK_DIR"/AndroidManifest.xml -S "$APK_DIR"/res -I "$ANDROID_JAR"

echo "Compiling Java sources..."
javac -source 1.8 -target 1.8 -bootclasspath "$ANDROID_JAR" -d "$APK_DIR"/bin "$APK_DIR"/gen/com/mna5305/unideadlines/R.java "$APK_DIR"/src/com/mna5305/unideadlines/MainActivity.java

echo "Dexing classes..."
dalvik-exchange --dex --output="$APK_DIR"/bin/classes.dex "$APK_DIR"/bin

echo "Packaging APK..."
aapt package -f -M "$APK_DIR"/AndroidManifest.xml -S "$APK_DIR"/res -A "$APK_DIR"/assets -I "$ANDROID_JAR" -F "$APK_DIR"/bin/app.unsigned.apk
cd "$APK_DIR"/bin
aapt add app.unsigned.apk classes.dex

echo "Generating Release signing key..."
rm -f /tmp/release.keystore
keytool -genkeypair -v -keystore /tmp/release.keystore -alias unideadlines -keyalg RSA -keysize 2048 -validity 10000 -storepass NaeemDeadlines2026 -keypass NaeemDeadlines2026 -dname "CN=Naeem Uni Deadlines,OU=Education,O=Virtual University,L=Lahore,ST=Punjab,C=PK"

echo "Zipaligning APK..."
zipalign -f -p -v 4 "$APK_DIR"/bin/app.unsigned.apk /app/applet/public/Naeem-Uni-Deadlines.apk

echo "Signing APK with v1, v2, v3 schemes..."
apksigner sign --ks /tmp/release.keystore --ks-pass pass:NaeemDeadlines2026 --key-pass pass:NaeemDeadlines2026 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true /app/applet/public/Naeem-Uni-Deadlines.apk

echo "Verifying APK..."
apksigner verify -v /app/applet/public/Naeem-Uni-Deadlines.apk

echo "APK build complete!"
ls -lh /app/applet/public/Naeem-Uni-Deadlines.apk
