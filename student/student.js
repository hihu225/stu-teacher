// Import the services from your central config file
import { auth, db } from '../firebase.js'; 

// Import the specific functions you need for this file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, getDoc,  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const studentWelcomeEl = document.getElementById('student-welcome');
const logoutBtn = document.getElementById('logout-btn');
const teacherListDiv = document.getElementById('teacher-list');
const myAppointmentsDiv = document.getElementById('my-appointments-list');
const searchNameInput = document.getElementById('search-name');
const searchDeptInput = document.getElementById('search-department');
const searchSubjectInput = document.getElementById('search-subject');

// Modal elements
const bookingModal = document.getElementById('booking-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const bookingForm = document.getElementById('booking-form');
const modalTeacherName = document.getElementById('modal-teacher-name');
const modalTeacherIdInput = document.getElementById('modal-teacher-id');

let currentStudentId = null;
let allTeachers = []; // Cache for teachers to filter client-side

// --- Auth Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'student') {
            const userData = userDoc.data();
            if (userData.status !== 'approved') {
                 alert('Your account is still pending approval.');
                 await signOut(auth);
                 window.location.href = '../index.html';
                 return;
            }
            currentStudentId = user.uid;
            studentWelcomeEl.textContent = `Welcome, ${userData.name}`;
            studentWelcomeEl.classList.remove('hidden');
            loadTeachers();
            loadMyAppointments();
        } else {
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

// --- Teacher Search and Display ---
const loadTeachers = () => {
    const q = query(collection(db, "users"), where("role", "==", "teacher"), where("status", "==", "approved"));
    onSnapshot(q, (querySnapshot) => {
        allTeachers = [];
        querySnapshot.forEach((doc) => {
            allTeachers.push({ id: doc.id, ...doc.data() });
        });
        renderTeachers(allTeachers);
    });
};

const renderTeachers = (teachers) => {
    teacherListDiv.innerHTML = `<table class="min-w-full bg-white"><thead><tr>
        <th class="py-2 px-4 border-b">Name</th>
        <th class="py-2 px-4 border-b">Department</th>
        <th class="py-2 px-4 border-b">Subject</th>
        <th class="py-2 px-4 border-b">Action</th>
    </tr></thead><tbody></tbody></table>`;
    const tbody = teacherListDiv.querySelector('tbody');
    if (teachers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No teachers found.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    teachers.forEach(teacher => {
        const row = `
            <tr>
                <td class="py-2 px-4 border-b">${teacher.name}</td>
                <td class="py-2 px-4 border-b">${teacher.department}</td>
                <td class="py-2 px-4 border-b">${teacher.subject}</td>
                <td class="py-2 px-4 border-b text-center">
                    <button onclick="openBookingModal('${teacher.id}', '${teacher.name}')" class="book-btn bg-blue-500 text-white px-3 py-1 rounded text-sm">Book</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
};

// Filtering logic
[searchNameInput, searchDeptInput, searchSubjectInput].forEach(input => {
    input.addEventListener('keyup', () => {
        const nameFilter = searchNameInput.value.toLowerCase();
        const deptFilter = searchDeptInput.value.toLowerCase();
        const subjectFilter = searchSubjectInput.value.toLowerCase();

        const filteredTeachers = allTeachers.filter(teacher => {
            return teacher.name.toLowerCase().includes(nameFilter) &&
                   teacher.department.toLowerCase().includes(deptFilter) &&
                   teacher.subject.toLowerCase().includes(subjectFilter);
        });
        renderTeachers(filteredTeachers);
    });
});


// --- Appointment Booking ---
window.openBookingModal = (teacherId, teacherName) => {
    modalTeacherIdInput.value = teacherId;
    modalTeacherName.textContent = teacherName;
    bookingModal.style.display = 'block';
};

closeModalBtn.onclick = () => {
    bookingModal.style.display = 'none';
    bookingForm.reset();
};

window.onclick = (event) => {
    if (event.target == bookingModal) {
        bookingModal.style.display = 'none';
        bookingForm.reset();
    }
};

bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherId = modalTeacherIdInput.value;
    const dateTime = document.getElementById('appointment-datetime').value;
    const message = document.getElementById('appointment-message').value;

    if (!currentStudentId || !teacherId) {
        alert('Error: User or teacher information is missing.');
        return;
    }
    
    // Basic validation for date
    if (new Date(dateTime) < new Date()) {
        alert("You cannot book an appointment in the past.");
        return;
    }

    try {
        await addDoc(collection(db, "appointments"), {
            studentId: currentStudentId,
            teacherId: teacherId,
            dateTime: dateTime,
            message: message,
            status: 'pending' // Initial status
        });
        alert('Appointment requested successfully!');
        bookingModal.style.display = 'none';
        bookingForm.reset();
    } catch (error) {
        console.error("Error booking appointment: ", error);
        alert('Error: ' + error.message);
    }
});

// --- Load My Appointments ---
const loadMyAppointments = () => {
    if (!currentStudentId) return;
    const q = query(collection(db, "appointments"), where("studentId", "==", currentStudentId));
    
    onSnapshot(q, async (querySnapshot) => {
        if (querySnapshot.empty) {
            myAppointmentsDiv.innerHTML = '<p class="text-gray-500 text-center py-4">You have no appointments.</p>';
            return;
        }

        let appointments = [];
        // Fetch all teacher names
        for (const docSnap of querySnapshot.docs) {
            const appointment = { id: docSnap.id, ...docSnap.data() };
            const teacherDoc = await getDoc(doc(db, "users", appointment.teacherId));
            appointment.teacherName = teacherDoc.exists() ? teacherDoc.data().name : "Unknown Teacher";
            appointments.push(appointment);
        }
        
        // Sort by date
        appointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        myAppointmentsDiv.innerHTML = ''; // Clear previous list
        appointments.forEach(app => {
            let statusClass = '';
            switch(app.status) {
                case 'approved': statusClass = 'bg-green-100 text-green-800'; break;
                case 'cancelled': statusClass = 'bg-red-100 text-red-800'; break;
                default: statusClass = 'bg-yellow-100 text-yellow-800'; break;
            }
            const appointmentCard = `
                <div class="border rounded-lg p-4 mb-3 bg-white shadow-sm">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-gray-800">${app.teacherName}</p>
                            <p class="text-sm text-gray-600">${new Date(app.dateTime).toLocaleString()}</p>
                        </div>
                        <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusClass}">
                            ${app.status}
                        </span>
                    </div>
                     ${app.message ? `<p class="text-sm text-gray-700 mt-2 pt-2 border-t"><strong>Message:</strong> ${app.message}</p>` : ''}
                </div>
            `;
            myAppointmentsDiv.innerHTML += appointmentCard;
        });
    });
};
