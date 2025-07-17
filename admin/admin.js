// Import the services from your central config file
import { auth, db } from '../firebase.js';

// Import the specific functions you need for this file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


const teacherForm = document.getElementById('add-teacher-form');
const teacherListDiv = document.getElementById('teacher-list');
const pendingUsersDiv = document.getElementById('pending-users-list'); // Updated ID
const allAppointmentsDiv = document.getElementById('all-appointments-list');
const logoutBtn = document.getElementById('logout-btn');
const adminNameEl = document.getElementById('admin-name');
const cancelEditBtn = document.getElementById('cancel-edit-btn');


// --- Auth Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin' && userDoc.data().status === 'approved') {
            adminNameEl.textContent = `Welcome, ${userDoc.data().name}`;
            loadTeachers();
            loadPendingUsers(); // Updated function call
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
    // ... (Logout logic remains the same)
    try {
        await signOut(auth);
        window.location.href = '../index.html';
    } catch (error) {
        console.error("Logout Error:", error);
        alert('Failed to log out.');
    }
});

// --- Teacher Management ---
// ... (Teacher management logic remains the same)
const loadTeachers = () => {
    const q = query(collection(db, "users"), where("role", "==", "teacher"));
    onSnapshot(q, (querySnapshot) => {
        teacherListDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Department</th><th class="py-2 px-4 border-b">Subject</th><th class="py-2 px-4 border-b">Actions</th></tr></thead><tbody></tbody></table>';
        const tbody = teacherListDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No teachers found.</td></tr>';
            return;
        }
        let rows = '';
        querySnapshot.forEach(doc => {
            const teacher = doc.data();
            const teacherId = doc.id;
            rows += `<tr data-id="${teacherId}"><td class="py-2 px-4 border-b">${teacher.name}</td><td class="py-2 px-4 border-b">${teacher.department}</td><td class="py-2 px-4 border-b">${teacher.subject}</td><td class="py-2 px-4 border-b text-center"><button class="edit-btn bg-yellow-500 text-white px-2 py-1 rounded text-sm hover:bg-yellow-600">Edit</button> <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">Delete</button></td></tr>`;
        });
        tbody.innerHTML = rows;
    });
};
teacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherId = document.getElementById('teacher-id').value;
    const name = document.getElementById('teacher-name').value;
    const department = document.getElementById('teacher-department').value;
    const subject = document.getElementById('teacher-subject').value;
    const teacherData = { name, department, subject, role: 'teacher', status: 'approved', email: `${name.replace(/\s+/g, '.').toLowerCase()}@school.edu` };
    try {
        if (teacherId) {
            const teacherRef = doc(db, "users", teacherId);
            await updateDoc(teacherRef, { name, department, subject });
            alert('Teacher updated successfully!');
        } else {
            await addDoc(collection(db, "users"), teacherData);
            alert('Teacher added successfully! IMPORTANT: You must manually create a login for this teacher in Firebase Authentication.');
        }
        teacherForm.reset();
        document.getElementById('teacher-id').value = '';
        teacherForm.querySelector('button[type="submit"]').textContent = 'Add Teacher';
        cancelEditBtn.classList.add('hidden');
    } catch (error) {
        console.error("Error managing teacher:", error);
        alert('Error: ' + error.message);
    }
});
teacherListDiv.addEventListener('click', async (e) => {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;
    const teacherId = row.dataset.id;
    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this teacher? This is permanent.')) {
            try {
                await deleteDoc(doc(db, "users", teacherId));
                alert('Teacher deleted successfully.');
            } catch (error) {
                console.error("Error deleting teacher:", error);
                alert('Error: ' + error.message);
            }
        }
    }
    if (target.classList.contains('edit-btn')) {
        const name = row.cells[0].textContent;
        const department = row.cells[1].textContent;
        const subject = row.cells[2].textContent;
        document.getElementById('teacher-id').value = teacherId;
        document.getElementById('teacher-name').value = name;
        document.getElementById('teacher-department').value = department;
        document.getElementById('teacher-subject').value = subject;
        teacherForm.querySelector('button[type="submit"]').textContent = 'Update Teacher';
        cancelEditBtn.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
});
cancelEditBtn.addEventListener('click', () => {
    teacherForm.reset();
    document.getElementById('teacher-id').value = '';
    teacherForm.querySelector('button[type="submit"]').textContent = 'Add Teacher';
    cancelEditBtn.classList.add('hidden');
});


// --- User Approval ---
const loadPendingUsers = () => {
    // Query for any user with a 'pending' status
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    onSnapshot(q, (querySnapshot) => {
        // Added a "Role" column to the header
        pendingUsersDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Email</th><th class="py-2 px-4 border-b">Role</th><th class="py-2 px-4 border-b">Action</th></tr></thead><tbody></tbody></table>';
        const tbody = pendingUsersDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No pending user registrations.</td></tr>';
            return;
        }
        let rows = '';
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            rows += `
                <tr>
                    <td class="py-2 px-4 border-b">${user.name}</td>
                    <td class="py-2 px-4 border-b">${user.email}</td>
                    <td class="py-2 px-4 border-b capitalize">${user.role}</td>
                    <td class="py-2 px-4 border-b text-center">
                        <button onclick="approveUser('${userId}')" class="approve-user-btn bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600">Approve</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = rows;
    });
};

window.approveUser = async (userId) => {
    if (confirm('Are you sure you want to approve this user?')) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { status: 'approved' });
            alert('User approved successfully!');
        } catch (error) {
            console.error("Error approving user:", error);
            alert('Error: ' + error.message);
        }
    }
};

// --- View All Appointments ---
// ... (Appointment viewing logic remains the same)
const loadAllAppointments = () => {
    const q = collection(db, "appointments");
    onSnapshot(q, async (querySnapshot) => {
        allAppointmentsDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Student</th><th class="py-2 px-4 border-b">Teacher</th><th class="py-2 px-4 border-b">Date & Time</th><th class="py-2 px-4 border-b">Status</th><th class="py-2 px-4 border-b">Message</th></tr></thead><tbody></tbody></table>';
        const tbody = allAppointmentsDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No appointments found.</td></tr>';
            return;
        }
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersMap = new Map();
        usersSnapshot.forEach(doc => usersMap.set(doc.id, doc.data()));
        let appointments = querySnapshot.docs.map(docSnap => {
            const appointment = docSnap.data();
            const studentName = usersMap.get(appointment.studentId)?.name || "Unknown Student";
            const teacherName = usersMap.get(appointment.teacherId)?.name || "Unknown Teacher";
            return { ...appointment, studentName, teacherName };
        });
        appointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        let rows = '';
        appointments.forEach(app => {
            const statusClass = app.status === 'approved' ? 'text-green-600' : app.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600';
            rows += `<tr><td class="py-2 px-4 border-b">${app.studentName}</td><td class="py-2 px-4 border-b">${app.teacherName}</td><td class="py-2 px-4 border-b">${new Date(app.dateTime).toLocaleString()}</td><td class="py-2 px-4 border-b font-semibold ${statusClass}">${app.status}</td><td class="py-2 px-4 border-b">${app.message}</td></tr>`;
        });
        tbody.innerHTML = rows;
    });
};
