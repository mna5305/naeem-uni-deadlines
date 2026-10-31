# Naeem’s Uni Deadlines 🎓

A mobile-first, offline-ready Progressive Web App (PWA) tailored for Virtual University (and university students in Pakistan) to track assignments, quizzes, GDBs, fee vouchers, and exam deadlines with live countdowns, streaks, and GitHub integration.

---

## ✨ Features

- **100% Offline Progressive Web App (PWA)**:
  - Works without internet connection using Service Worker caching.
  - Installable directly to phone Home Screen on Android & iOS Safari.
  - Standalone app-like experience with safe area notch insets.
- **University Deadlines & Categories**:
  - 📝 Assignments (`CS101`, `CS201`, etc. with distinct course color hues)
  - ⏱️ Quizzes
  - 💬 Graded Discussion Boards (GDB)
  - 💰 Fee Installment Voucher Tracker (Rs / PKR) with Remaining, Paid, and Total summaries
  - ✏️ Custom Categories (Midterms, Presentations, Final Projects)
- **Real-Time Live Countdown**:
  - Live ticking countdown down to the exact second ("3d 4h 12m 45s left" or "Overdue by...").
  - Urgent Alert box blinking and glowing when deadlines are under 24 hours.
- **Streak & Gamification**:
  - Circular progress completion ring with smooth SVG animation.
  - Streak day counter for continuous daily study habit.
  - Celebratory confetti effects upon completing tasks.
- **Screenshot Voucher Scanner**:
  - Upload fee voucher screenshot or snap photo; extracts installment amounts and due dates using Gemini 3.8 Flash.
  - Manual installment editor with table review and duplicate prevention.
- **GitHub Sync & Cloud Backup ("github ki help se")**:
  - **GitHub Gist Sync**: Sync your deadlines across your phone, tablet, and PC privately using GitHub Gists.
  - **GitHub Pages CI/CD**: Pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`) to host your app on GitHub Pages for free.
- **Safety Snapshots**:
  - Automatic 30-day safety snapshot archive stored in browser.
  - Export/Import standard `.json` backup files.
  - One-click Undo for completed or deleted tasks.

---

## 🚀 How to Host on GitHub Pages

1. Initialize Git and commit:
   ```bash
   git init
   git add .
   git commit -m "Naeem Uni Deadlines offline PWA"
   git branch -M main
   ```

2. Link to your GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to **Settings > Pages** in your GitHub repository.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
   - Your app will automatically build and deploy to:
     `https://<your-username>.github.io/<repo-name>/`

---

## 📲 Installing on Your Phone

### Android (Chrome / Brave)
1. Open the URL in Chrome.
2. Tap the in-app **Install** button or tap Chrome's `⋮` menu > **Install app** / **Add to Home Screen**.

### iPhone / iPad (Safari)
1. Open the URL in Safari.
2. Tap the **Share** button (box with upward arrow) in the bottom toolbar.
3. Tap **Add to Home Screen**.
