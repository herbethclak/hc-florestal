# Installation Guide - HC Forestry Management System

This document contains instructions for installing and running the forestry management system in a local or production environment.

## 1. Prerequisites
- Node.js (Version 18 or higher)
- NPM or Yarn
- A Firebase account (Google)

## 2. Local Installation
1. Extract the source code ZIP file.
2. Open the terminal in the project folder.
3. Run the command to install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the project root based on `.env.example` and fill it with your Firebase keys.
5. Start the development server:
   ```bash
   npm run dev
   ```

## 3. Firebase Configuration
For the database to work, you must:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Authentication** (Google Method).
3. Copy the Web SDK credentials and paste them into the `firebase-applet-config.json` file.
4. **Important:** Change the default administrator email (currently `ADMIN_EMAIL_HERE@GMAIL.COM`) in the following files:
   - `firestore.rules` (in the `isAdmin` function)
   - `src/App.tsx` (in the `isAdmin` check within the profile `useEffect`)
5. Deploy the security rules contained in `firestore.rules`.

## 4. Technologies Used
- **Frontend:** React.js + TypeScript + Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Backend/Database:** Firebase (Firestore & Auth)
- **Charts:** Recharts

---
**License:** This code is provided under a commercial use license. Reselling the source code without express authorization from the original author is prohibited.
