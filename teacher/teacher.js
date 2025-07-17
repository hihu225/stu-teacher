import { auth, db } from '../firebase.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc, updateDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
            teacherWelcomeEl.textContent = `Welcome, ${teacherData.name}`;
            teacherWelcomeEl.classList.remove('hidden');
            loadAppointments();
        } else {
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = '../index.html';
    }
});

// --- Appointment Loading and Management ---
const loadAppointments = () => {
    if (!currentTeacherId) return;

    const q = query(collection(db, "appointments"), where("teacherId", "==", currentTeacherId));
    
    onSnapshot(q, (querySnapshot) => {
        const pendingAppointments = [];
        const approvedAppointments = [];
        const historyAppointments = [];

        // **MODIFIED:** No longer need to fetch student data separately
        querySnapshot.forEach(docSnap => {
            const appointment = { id: docSnap.id, ...docSnap.data() };
            
            if (appointment.status === 'pending') {
                pendingAppointments.push(appointment);
            } else if (appointment.status === 'approved') {
                approvedAppointments.push(appointment);
            } else { 
                historyAppointments.push(appointment);
            }
        });
        
        pendingAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        approvedAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        historyAppointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        renderAppointments(pendingAppointmentsDiv, pendingAppointments, 'pending');
        renderAppointments(approvedAppointmentsDiv, approvedAppointments, 'approved');
        renderAppointments(historyAppointmentsDiv, historyAppointments, 'history');

    }, (error) => {
        console.error("Error fetching appointments snapshot:", error);
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

    tbody.innerHTML = '';
    appointments.forEach(app => {
        let actionButtons = '';
        if (type === 'pending') {
            actionButtons = `<button onclick="updateAppointmentStatus('${app.id}', 'approved')" class="approve-btn bg-green-500 text-white px-2 py-1 rounded text-sm mr-2 hover:bg-green-600">Approve</button><button onclick="updateAppointmentStatus('${app.id}', 'cancelled')" class="cancel-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">Decline</button>`;
        } else if (type === 'approved') {
            actionButtons = `<button onclick="updateAppointmentStatus('${app.id}', 'cancelled')" class="cancel-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">Cancel</button>`;
        }
        
        const statusCell = type === 'history' ? `<td class="py-2 px-4 border-b font-semibold ${app.status === 'cancelled' ? 'text-red-600' : 'text-gray-500'}">${app.status}</td>` : `<td class="py-2 px-4 border-b text-center">${actionButtons}</td>`;

        // **MODIFIED:** Using app.studentName directly
        const row = `
            <tr>
                <td class="py-2 px-4 border-b">${app.studentName || 'Unknown Student'}</td>
                <td class="py-2 px-4 border-b">${new Date(app.dateTime).toLocaleString()}</td>
                <td class="py-2 px-4 border-b">${app.message}</td>
                ${statusCell}
            </tr>
        `;
        tbody.innerHTML += row;
    });
};

// --- Other functions (logout, updateAppointmentStatus) remain unchanged ---
logoutBtn.addEventListener('click', async () => { await signOut(auth); window.location.href = '../index.html'; });
window.updateAppointmentStatus = async (appointmentId, newStatus) => { const confirmationText = newStatus === 'approved' ? 'Are you sure you want to approve this appointment?' : 'Are you sure you want to cancel this appointment?'; if (confirm(confirmationText)) { try { const appointmentRef = doc(db, "appointments", appointmentId); await updateDoc(appointmentRef, { status: newStatus }); alert(`Appointment has been ${newStatus}.`); } catch (error) { console.error("Error updating appointment:", error); alert('Error: ' + error.message); } } };
