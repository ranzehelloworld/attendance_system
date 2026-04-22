# 🚀 BSIT 1C | Real-Time Attendance Portal

A modern, cloud-synced attendance tracking system. This portal allows for real-time tracking of student "Time In" and "Time Out" status with instant synchronization across all devices.

## ✨ Features

* **Real-Time Sync:** Powered by Firebase Realtime Database. Changes made on one device reflect instantly on all others.
* **Automated Logging:** Captures the exact time of check-in/out in 12-hour format.
* **Dynamic Search:** Quick-filter student list by name or ID.
* **Live Statistics:** Real-time calculation of Present/Absent counts and attendance percentage.
* **CSV Export:** Generate and download attendance reports for administrative use.
* **Responsive Design:** Fully optimized for mobile, tablet, and desktop using Tailwind CSS.
* **Persistent Branding:** Saves the event name locally so it stays even after a refresh.

## 🛠️ Tech Stack

* **Frontend:** HTML5, Tailwind CSS (Styling)
* **Backend/Database:** Firebase Realtime Database (NoSQL)
* **Icons:** Google Material Symbols
* **Fonts:** Space Grotesk & Manrope (via Google Fonts)

## 📁 Project Structure

* `index.html` - The core structure and UI layout.
* `script.js` - Logic for Firebase integration, time calculations, and UI rendering.
* `logo.png` - Custom portal branding.

## 🚀 How to Use

1.  **Open the Portal:** Access the site via the GitHub Pages link.
2.  **Set Event Name:** Enter the name of the subject or activity (e.g., "Computer Programming").
3.  **Check Attendance:** * Toggle the **In** switch to log arrival time.
    * Toggle the **Out** switch to log departure time.
4.  **Monitor Stats:** View the live "Attendance Rate" bar at the bottom.
5.  **Export:** Click "Export CSV" to save the day's record to your device.

## ⚙️ Configuration

To run this project locally or on your own Firebase instance:

1.  Create a project in the [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Realtime Database**.
3.  Set Database Rules to:
    ```json
    {
      "rules": {
        ".read": "true",
        ".write": "true"
      }
    }
    ```
4.  Replace the `firebaseConfig` object in `script.js` with your project's unique API keys.

---
**Version:** 4.8.26  
**Developed for:** Isabela State University - BSIT 1C  
*By: ranzjs :D*
