import { auth, db } from '../firebase.js'; 

// Import the specific functions you need for this file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc,  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const teacherWelcomeEl = document.getElementById('teacher-welcome');
const pendingAppointmentsDiv = document.getElementById('pending-appointments-list');
const approvedAppointmentsDiv = document.getElementById('approved-appointments-list');
const historyAppointmentsDiv = document.getElementById('history-appointments-list');
const logoutBtn = document.getElementById('logout-btn');

let currentTeacherId = null;

// --- Auth Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'teacher') {
            currentTeacherId = user.uid;
            const teacherData = userDoc.data();
            teacherWelcomeEl.textContent = `Welcome, ${teacherData.name} (${teacherData.department})`;
            teacherWelcomeEl.classList.remove('hidden');
            loadAppointments();
        } else {
            // Not a teacher, redirect
            window.location.href = '../index.html';
        }
    } else {
        // Not logged in, redirect
        window.location.href = '../index.html';
    }
});

// --- Logout ---
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
});

// --- Appointment Loading and Management ---
const loadAppointments = () => {
    if (!currentTeacherId) return;

    const q = query(collection(db, "appointments"), where("teacherId", "==", currentTeacherId));
    
    onSnapshot(q, async (querySnapshot) => {
        const pendingAppointments = [];
        const approvedAppointments = [];
        const historyAppointments = [];

        // Use Promise.all to fetch all student names in parallel
        const appointmentPromises = querySnapshot.docs.map(async (docSnap) => {
            const appointment = { id: docSnap.id, ...docSnap.data() };
            const studentDoc = await getDoc(doc(db, "users", appointment.studentId));
            appointment.studentName = studentDoc.exists() ? studentDoc.data().name : "Unknown Student";
            return appointment;
        });

        const allAppointments = await Promise.all(appointmentPromises);
        
        allAppointments.forEach(appointment => {
            if (appointment.status === 'pending') {
                pendingAppointments.push(appointment);
            } else if (appointment.status === 'approved') {
                approvedAppointments.push(appointment);
            } else { // 'cancelled', 'completed', etc.
                historyAppointments.push(appointment);
            }
        });
        
        // Sort appointments by date
        pendingAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        approvedAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        historyAppointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); // Show most recent history first

        renderAppointments(pendingAppointmentsDiv, pendingAppointments, 'pending');
        renderAppointments(approvedAppointmentsDiv, approvedAppointments, 'approved');
        renderAppointments(historyAppointmentsDiv, historyAppointments, 'history');
    });
};

const renderAppointments = (element, appointments, type) => {
    element.innerHTML = `<table class="min-w-full bg-white"><thead><tr>
        <th class="py-2 px-4 border-b">Student</th>
        <th class="py-2 px-4 border-b">Date & Time</th>
        <th class="py-2 px-4 border-b">Message</th>
        ${type !== 'history' ? '<th class="py-2 px-4 border-b">Actions</th>' : '<th class="py-2 px-4 border-b">Status</th>'}
    </tr></thead><tbody></tbody></table>`;
    
    const tbody = element.querySelector('tbody');
    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No appointments in this category.</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; // Clear existing rows
    appointments.forEach(app => {
        let actionButtons = '';
        if (type === 'pending') {
            actionButtons = `
                <button onclick="updateAppointmentStatus('${app.id}', 'approved')" class="approve-btn bg-green-500 text-white px-2 py-1 rounded text-sm mr-2">Approve</button>
                <button onclick="updateAppointmentStatus('${app.id}', 'cancelled')" class="cancel-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Decline</button>
            `;
        } else if (type === 'approved') {
            actionButtons = `
                <button onclick="updateAppointmentStatus('${app.id}', 'cancelled')" class="cancel-btn bg-red-500 text-white px-2 py-1 rounded text-sm">Cancel</button>
            `;
        }
        
        const statusCell = type === 'history' ? `<td class="py-2 px-4 border-b font-semibold ${app.status === 'cancelled' ? 'text-red-600' : 'text-gray-500'}">${app.status}</td>` : `<td class="py-2 px-4 border-b text-center">${actionButtons}</td>`;

        const row = `
            <tr>
                <td class="py-2 px-4 border-b">${app.studentName}</td>
                <td class="py-2 px-4 border-b">${new Date(app.dateTime).toLocaleString()}</td>
                <td class="py-2 px-4 border-b">${app.message}</td>
                ${statusCell}
            </tr>
        `;
        tbody.innerHTML += row;
    });
};

window.updateAppointmentStatus = async (appointmentId, newStatus) => {
    const confirmationText = newStatus === 'approved' 
        ? 'Are you sure you want to approve this appointment?'
        : 'Are you sure you want to cancel this appointment?';

    if (confirm(confirmationText)) {
        try {
            const appointmentRef = doc(db, "appointments", appointmentId);
            await updateDoc(appointmentRef, { status: newStatus });
            alert(`Appointment has been ${newStatus}.`);
        } catch (error) {
            console.error("Error updating appointment:", error);
            alert('Error: ' + error.message);
        }
    }
};
