// auth.js

// Handle user registration
async function registerUser(email, password, name, role, department = '', subject = '') {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    // Set 'approved' to false for students, true for others
    const isApproved = role !== 'student';
    
    await db.collection('users').doc(userCredential.user.uid).set({
      name,
      email,
      role,
      department,
      subject,
      approved: isApproved 
    });

    logAction(userCredential.user.uid, `User registered as ${role}`);
    return userCredential.user;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Handle user login
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
    
    // Check if user document exists in Firestore
    if (!userDoc.exists) {
      await auth.signOut();
      throw new Error('Account does not exist. Please register first.');
    }
    
    const userData = userDoc.data();

    // Check if the user's account is approved
    if (userData.approved === false) {
      await auth.signOut(); // Sign out the unapproved user
      throw new Error('Your account is pending admin approval. Please try again later.');
    }
    
    logAction(userCredential.user.uid, 'User logged in');
    return userData;
  } catch (error) {
    console.error("Login error:", error);
    // Re-throw the error to be caught by the frontend
    throw error;
  }
}

// Handle user logout
function logoutUser() {
  return auth.signOut();
}

// Get current user data
async function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDoc = await db.collection('users').doc(user.uid).get();
  return userDoc.exists ? { uid: user.uid, ...userDoc.data() } : null;
}

// Log actions
function logAction(userId, action) {
  db.collection('logs').add({
    userId,
    action,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Listen for auth state changes
function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(callback);
}