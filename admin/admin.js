// Import the services from your central config file
import { auth, db } from '../firebase.js';

// Import the specific functions you need for this file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const pendingUsersDiv = document.getElementById('pending-users-list');
const teacherListDiv = document.getElementById('teacher-list');
const studentListDiv = document.getElementById('student-list');
const upcomingAppointmentsDiv = document.getElementById('upcoming-appointments-list');
const finishedAppointmentsDiv = document.getElementById('finished-appointments-list');
const logoutBtn = document.getElementById('logout-btn');
const adminNameEl = document.getElementById('admin-name');

// --- Auth Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        // CORRECTED: Used getDoc for a single document instead of getDocs
        const userDoc = await getDoc(userDocRef); 
        if (userDoc.exists() && userDoc.data().role === 'admin' && userDoc.data().status === 'approved') {
            adminNameEl.textContent = `Welcome, ${userDoc.data().name}`;
            loadPendingUsers();
            loadAllUsers();
            loadAllAppointments();
        } else {
            alert('Access denied. You must be an admin to view this page.');
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = '../index.html';
    }
});

// --- Logout ---
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
});

// --- User Approval ---
const loadPendingUsers = () => {
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    onSnapshot(q, (querySnapshot) => {
        pendingUsersDiv.innerHTML = `<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Email</th><th class="py-2 px-4 border-b">Role</th><th class="py-2 px-4 border-b">Action</th></tr></thead><tbody></tbody></table>`;
        const tbody = pendingUsersDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No pending user registrations.</td></tr>';
            return;
        }
        let rows = '';
        querySnapshot.forEach(doc => {
            const user = doc.data();
            rows += `<tr><td class="py-2 px-4 border-b">${user.name}</td><td class="py-2 px-4 border-b">${user.email}</td><td class="py-2 px-4 border-b capitalize">${user.role}</td><td class="py-2 px-4 border-b text-center"><button onclick="approveUser('${doc.id}')" class="approve-user-btn bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">Approve</button></td></tr>`;
        });
        tbody.innerHTML = rows;
    });
};

window.approveUser = async (userId) => {
    if (confirm('Are you sure you want to approve this user?')) {
        await updateDoc(doc(db, "users", userId), { status: 'approved' });
        alert('User approved successfully!');
    }
};

// --- User Management ---
const loadAllUsers = () => {
    const q = query(collection(db, "users"), where("status", "==", "approved"));
    onSnapshot(q, (querySnapshot) => {
        const teachers = [];
        const students = [];
        querySnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            if (user.role === 'teacher') teachers.push(user);
            else if (user.role === 'student') students.push(user);
        });
        renderUserList(teacherListDiv, teachers, 'teacher');
        renderUserList(studentListDiv, students, 'student');
    });
};

const renderUserList = (element, users, role) => {
    let headers = '<th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Email</th>';
    if (role === 'teacher') {
        headers += '<th class="py-2 px-4 border-b">Department</th><th class="py-2 px-4 border-b">Subject</th>';
    }
    headers += '<th class="py-2 px-4 border-b">Action</th>';
    
    element.innerHTML = `<table class="min-w-full bg-white"><thead><tr>${headers}</tr></thead><tbody></tbody></table>`;
    const tbody = element.querySelector('tbody');
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${role === 'teacher' ? 5 : 3}" class="text-center py-4">No ${role}s found.</td></tr>`;
        return;
    }
    let rows = '';
    users.forEach(user => {
        rows += `<tr><td class="py-2 px-4 border-b">${user.name}</td><td class="py-2 px-4 border-b">${user.email}</td>`;
        if (role === 'teacher') {
            rows += `<td class="py-2 px-4 border-b">${user.department}</td><td class="py-2 px-4 border-b">${user.subject}</td>`;
        }
        rows += `<td class="py-2 px-4 border-b text-center"><button onclick="deleteUser('${user.id}')" class="delete-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">Delete</button></td></tr>`;
        rows += `</tr>`;
    });
    tbody.innerHTML = rows;
};

window.deleteUser = async (userId) => {
    if (confirm('Are you sure you want to delete this user? This action is permanent.')) {
        await deleteDoc(doc(db, "users", userId));
        alert('User deleted successfully. Note: This does not remove them from Firebase Authentication.');
    }
};

// --- Appointments Log ---
const loadAllAppointments = () => {
    const q = collection(db, "appointments");
    onSnapshot(q, async (querySnapshot) => {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersMap = new Map();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));

        const now = new Date();
        const upcoming = [];
        const finished = [];

        querySnapshot.forEach(docSnap => {
            const appointment = { id: docSnap.id, ...docSnap.data() };
            appointment.studentName = usersMap.get(appointment.studentId)?.name || "Unknown";
            appointment.teacherName = usersMap.get(appointment.teacherId)?.name || "Unknown";
            
            const appDate = new Date(appointment.dateTime);
            if (appDate > now) {
                upcoming.push(appointment);
            } else {
                finished.push(appointment);
            }
        });

        // Sort upcoming soonest first, and finished most recent first
        upcoming.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        finished.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        renderAppointments(upcomingAppointmentsDiv, upcoming, 'upcoming');
        renderAppointments(finishedAppointmentsDiv, finished, 'finished');
    });
};

const renderAppointments = (element, appointments, type) => {
    element.innerHTML = `<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Student</th><th class="py-2 px-4 border-b">Teacher</th><th class="py-2 px-4 border-b">Date & Time</th><th class="py-2 px-4 border-b">Status</th></tr></thead><tbody></tbody></table>`;
    const tbody = element.querySelector('tbody');
    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No ${type} appointments.</td></tr>`;
        return;
    }
    let rows = '';
    appointments.forEach(app => {
        const statusClass = app.status === 'approved' ? 'text-green-600' : app.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600';
        rows += `<tr><td class="py-2 px-4 border-b">${app.studentName}</td><td class="py-2 px-4 border-b">${app.teacherName}</td><td class="py-2 px-4 border-b">${new Date(app.dateTime).toLocaleString()}</td><td class="py-2 px-4 border-b font-semibold ${statusClass}">${app.status}</td></tr>`;
    });
    tbody.innerHTML = rows;
};
