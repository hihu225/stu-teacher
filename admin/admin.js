// Import the services from your central config file
import { auth, db } from '../firebase.js'; 

// Import the specific functions you need for this file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc, } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const teacherForm = document.getElementById('add-teacher-form');
const teacherListDiv = document.getElementById('teacher-list');
const pendingStudentsDiv = document.getElementById('pending-students-list');
const allAppointmentsDiv = document.getElementById('all-appointments-list');
const logoutBtn = document.getElementById('logout-btn');
const adminNameEl = document.getElementById('admin-name');
const cancelEditBtn = document.getElementById('cancel-edit-btn');


// --- Auth Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            adminNameEl.textContent = `Welcome, ${userDoc.data().name}`;
            loadTeachers();
            loadPendingStudents();
            loadAllAppointments();
        } else {
            // Not an admin or no user data, redirect to login
            window.location.href = '../index.html';
        }
    } else {
        // Not logged in, redirect to login
        window.location.href = '../index.html';
    }
});

// --- Logout ---
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
});

// --- Teacher Management ---
const loadTeachers = () => {
    const q = query(collection(db, "users"), where("role", "==", "teacher"));
    onSnapshot(q, (querySnapshot) => {
        teacherListDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Department</th><th class="py-2 px-4 border-b">Subject</th><th class="py-2 px-4 border-b">Actions</th></tr></thead><tbody></tbody></table>';
        const tbody = teacherListDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No teachers found.</td></tr>';
            return;
        }
        querySnapshot.forEach(doc => {
            const teacher = doc.data();
            const teacherId = doc.id;
            const row = `
                <tr data-id="${teacherId}">
                    <td class="py-2 px-4 border-b">${teacher.name}</td>
                    <td class="py-2 px-4 border-b">${teacher.department}</td>
                    <td class="py-2 px-4 border-b">${teacher.subject}</td>
                    <td class="py-2 px-4 border-b text-center">
                        <button class="edit-btn bg-yellow-500 text-white px-2 py-1 rounded text-sm">Edit</button>
                        <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    });
};

teacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherId = document.getElementById('teacher-id').value;
    const name = document.getElementById('teacher-name').value;
    const department = document.getElementById('teacher-department').value;
    const subject = document.getElementById('teacher-subject').value;

    const teacherData = { name, department, subject, role: 'teacher', status: 'approved' };

    try {
        if (teacherId) {
            // Update
            const teacherRef = doc(db, "users", teacherId);
            await updateDoc(teacherRef, teacherData);
            alert('Teacher updated successfully!');
        } else {
            // Add new - NOTE: This flow doesn't create an Auth user. 
            // A more robust system would use a server-side function to create both Auth and Firestore records.
            // For this client-side example, we'll just add to Firestore.
            await addDoc(collection(db, "users"), teacherData);
            alert('Teacher added successfully! Note: Auth user not created.');
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
    const teacherId = row.dataset.id;

    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this teacher?')) {
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
    }
});

cancelEditBtn.addEventListener('click', () => {
    teacherForm.reset();
    document.getElementById('teacher-id').value = '';
    teacherForm.querySelector('button[type="submit"]').textContent = 'Add Teacher';
    cancelEditBtn.classList.add('hidden');
});

// --- Student Approval ---
const loadPendingStudents = () => {
    const q = query(collection(db, "users"), where("role", "==", "student"), where("status", "==", "pending"));
    onSnapshot(q, (querySnapshot) => {
        pendingStudentsDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Name</th><th class="py-2 px-4 border-b">Email</th><th class="py-2 px-4 border-b">Action</th></tr></thead><tbody></tbody></table>';
        const tbody = pendingStudentsDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">No pending student registrations.</td></tr>';
            return;
        }
        querySnapshot.forEach(doc => {
            const student = doc.data();
            const studentId = doc.id;
            const row = `
                <tr>
                    <td class="py-2 px-4 border-b">${student.name}</td>
                    <td class="py-2 px-4 border-b">${student.email}</td>
                    <td class="py-2 px-4 border-b text-center">
                        <button onclick="approveStudent('${studentId}')" class="approve-student-btn bg-green-500 text-white px-2 py-1 rounded text-sm">Approve</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    });
};

window.approveStudent = async (studentId) => {
    if (confirm('Are you sure you want to approve this student?')) {
        try {
            const studentRef = doc(db, "users", studentId);
            await updateDoc(studentRef, { status: 'approved' });
            alert('Student approved successfully!');
        } catch (error) {
            console.error("Error approving student:", error);
            alert('Error: ' + error.message);
        }
    }
};

// --- View All Appointments ---
const loadAllAppointments = () => {
    const q = collection(db, "appointments");
    onSnapshot(q, async (querySnapshot) => {
        allAppointmentsDiv.innerHTML = '<table class="min-w-full bg-white"><thead><tr><th class="py-2 px-4 border-b">Student</th><th class="py-2 px-4 border-b">Teacher</th><th class="py-2 px-4 border-b">Date & Time</th><th class="py-2 px-4 border-b">Status</th><th class="py-2 px-4 border-b">Message</th></tr></thead><tbody></tbody></table>';
        const tbody = allAppointmentsDiv.querySelector('tbody');
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No appointments found.</td></tr>';
            return;
        }
        
        let appointments = [];
        for (const docSnap of querySnapshot.docs) {
            const appointment = docSnap.data();
            const studentDoc = await getDoc(doc(db, "users", appointment.studentId));
            const teacherDoc = await getDoc(doc(db, "users", appointment.teacherId));
            
            const studentName = studentDoc.exists() ? studentDoc.data().name : "Unknown Student";
            const teacherName = teacherDoc.exists() ? teacherDoc.data().name : "Unknown Teacher";
            
            appointments.push({ ...appointment, studentName, teacherName });
        }
        
        // Sort appointments by date
        appointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

        tbody.innerHTML = ''; // Clear before appending
        appointments.forEach(app => {
            const statusClass = app.status === 'approved' ? 'text-green-600' : app.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600';
            const row = `
                <tr>
                    <td class="py-2 px-4 border-b">${app.studentName}</td>
                    <td class="py-2 px-4 border-b">${app.teacherName}</td>
                    <td class="py-2 px-4 border-b">${new Date(app.dateTime).toLocaleString()}</td>
                    <td class="py-2 px-4 border-b font-semibold ${statusClass}">${app.status}</td>
                    <td class="py-2 px-4 border-b">${app.message}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    });
};
