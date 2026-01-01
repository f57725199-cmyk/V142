# Firebase Security Rules (Active)

Use these rules in your **Firestore Database** -> **Rules** tab.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ===== USERS =====
    match /users/{userId} {

      // User apna data dekh sakta hai (User can read own data)
      allow read: if request.auth != null
                  && request.auth.uid == userId;

      // Admin sab users dekh sakta hai (Admin can read all users)
      allow read: if request.auth != null
                  && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";

      // User apna data likh sakta hai (User can write own data)
      allow write: if request.auth != null
                   && request.auth.uid == userId;
    }

    // ===== USER TEST RESULTS =====
    match /users/{userId}/test_results/{resultId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    // ===== CONTENT (PUBLIC READ) =====
    match /content_data/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }

    // ===== CONFIG =====
    match /config/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }

    // ===== PAYMENTS / REPORTS (ADMIN) =====
    // Fallback for other collections
    match /{collection}/{docId} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }
  }
}
```

## Realtime Database Rules (RTDB)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'ADMIN'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
      }
    },
    "content_data": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
    },
    "system_settings": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'ADMIN'"
    }
  }
}
```
