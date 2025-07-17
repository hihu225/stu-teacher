# Student-Teacher Appointment Booking System

## 1. Project Overview

This is a full-stack web application that allows students to book appointments with teachers. The system has three distinct roles: Student, Teacher, and Admin, each with their own dashboard and permissions. The application is built with vanilla HTML, CSS, and JavaScript for the frontend, and utilizes Firebase (Authentication and Firestore) for the backend.

---

## 2. Features

### User Roles & Permissions

* **Admin:**
    * Secure login.
    * Add, update, and delete teacher accounts.
    * View and approve pending student registrations.
    * View a master list of all appointments in the system.
* **Teacher:**
    * Secure login.
    * View incoming appointment requests from students.
    * Approve or cancel their appointments.
    * View a schedule of their approved and past appointments.
* **Student:**
    * Register for an account (requires admin approval).
    * Secure login after approval.
    * Search for teachers by name, department, or subject.
    * Book an appointment with a specific teacher, including a message and preferred time.
    * View the status of their booked appointments (pending, approved, cancelled).

---

## 3. Tech Stack

* **Frontend:**
    * HTML5
    * CSS3 (with Tailwind CSS for styling)
    * Vanilla JavaScript (ES6 Modules)
* **Backend:**
    * **Firebase Authentication:** For email/password-based user login and registration.
    * **Firebase Firestore:** A NoSQL database for storing user, teacher, and appointment data in real-time.
* **Deployment:**
    * Can be hosted on Firebase Hosting or any static site host like GitHub Pages.

---

## 4. Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repo-folder>
    ```

2.  **Create a Firebase Project:**
    * Go to the [Firebase Console](https://console.firebase.google.com/).
    * Click "Add project" and follow the setup steps.
    * Once your project is created, go to Project Settings > General.
    * Under "Your apps", click the web icon (`</>`) to register a new web app.
    * Copy the `firebaseConfig` object.

3.  **Configure the Application:**
    * Paste your `firebaseConfig` object into the `firebase.js` file.
    * In the Firebase Console, go to **Authentication** > **Sign-in method** and enable **Email/Password**.
    * Go to **Firestore Database**, create a database in **production mode**, and then navigate to the **Rules** tab. Paste the contents of `firestore.rules` into the editor and publish the changes.

4.  **Create an Admin User:**
    * The system requires at least one admin. Go to the **Authentication** tab in your Firebase Console.
    * Click "Add user" and create a user with an email and password.
    * Go to the **Firestore Database** tab. Create a `users` collection.
    * Create a new document, using the `uid` from the user you just created in Auth as the Document ID.
    * Add the following fields to the document:
        * `name`: "Admin User" (string)
        * `email`: "your-admin-email@example.com" (string)
        * `role`: "admin" (string)
        * `status`: "approved" (string)

5.  **Run the Application:**
    * Open the `index.html` file in your browser to start. You can use a simple live server extension in your code editor for the best experience.

---

## 5. Folder Structure


/
├── admin/
│   ├── admin.html         # Admin dashboard UI
│   └── admin.js           # Admin dashboard logic
├── student/
│   ├── student.html       # Student dashboard UI
│   └── student.js         # Student dashboard logic
├── teacher/
│   ├── teacher.html       # Teacher dashboard UI
│   └── teacher.js         # Teacher dashboard logic
├── firebase.js            # Central Firebase configuration
├── index.html             # Main login and registration page
├── style.css              # Shared CSS styles
├── firestore.rules        # Security rules for the database
└── README.md              # This file


---

## 6. Firestore Database Structure

### `users` collection
* **Document ID:** `user.uid` (from Firebase Auth)
* **Fields:**
    * `name`: (string) - Full name of the user.
    * `email`: (string) - User's email address.
    * `role`: (string) - "student", "teacher", or "admin".
    * `status`: (string) - "pending" or "approved". (Mainly for students).
    * `department`: (string) - Teacher's department (optional).
    * `subject`: (string) - Teacher's subject (optional).

### `appointments` collection
* **Document ID:** (auto-generated)
* **Fields:**
    * `studentId`: (string) - The `uid` of the student booking the appointment.
    * `teacherId`: (string) - The `uid` of the teacher the appointment is with.
    * `dateTime`: (timestamp/string) - The proposed date and time for the appointment.
    * `message`: (string) - An optional message from the student.
    * `status`: (string) - "pending", "approved", or "cancelled".
