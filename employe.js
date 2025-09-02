let currentUser = null;
let loginUserType = 'employee'; // Default to employee

// Base URL for your Python Flask backend
const API_BASE_URL = 'http://127.0.0.1:5000'; // Make sure this matches your Flask server's address

// --- Helper function for making API requests with exponential backoff ---
async function makeApiRequest(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status !== 401) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, error);
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
}

// --- Initialize ---
function initializeApplication() {
    console.log("HRMS Application Loaded - Backend Mode");
    document.getElementById("appContainer").style.display = "none";
    document.querySelector(".main").style.display = "flex";
    document.getElementById('bellIcon')?.addEventListener('click', toggleNotifications);
}

// --- Function to show Admin Login Form ---
function showAdminForm() {
  loginUserType = 'admin'; // Set the type for the login request
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("employeeForm").style.display = "flex";
  
  const loginBox = document.querySelector('#employeeForm .login-box');

  // Ensure login form is visible
  if (loginBox) {
    loginBox.style.display = 'block';
  }

  document.querySelector("#employeeForm .login-header").textContent = "ADMIN LOGIN";
  const registerLinkPara = document.querySelector("#employeeForm .login-box form p");
  if (registerLinkPara) {
    registerLinkPara.style.display = "none";
  }
  document.getElementById("loginDropdown").classList.remove("show");
}

// --- Function to show Employee Login Form ---
function showEmployeeForm() {
  loginUserType = 'employee'; // Set the type for the login request
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("employeeForm").style.display = "flex";

  const loginBox = document.querySelector('#employeeForm .login-box');
  
  // Ensure login form is visible
  if (loginBox) {
    loginBox.style.display = 'block';
  }
  
  document.querySelector("#employeeForm .login-header").textContent = "EMPLOYEE LOGIN";
  const registerLinkPara = document.querySelector("#employeeForm .login-box form p");
  if (registerLinkPara) {
    registerLinkPara.style.display = "none";
  }

  document.getElementById("loginDropdown").classList.remove("show");
}

// Function to toggle edit mode for a specific section
function toggleSectionEditMode(sectionId, isEditing) {
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Section with ID '${sectionId}' not found.`);
        return;
    }
    const inputs = section.querySelectorAll('input:not([disabled]), select:not([disabled])');
    const editBtn = section.querySelector('.accordion-header .toggle-btn:first-of-type');
    const saveBtn = section.querySelector('.accordion-header .toggle-btn:last-of-type');
    inputs.forEach(input => {
        input.disabled = !isEditing;
    });
    if (isEditing) {
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
    } else {
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
    }
}


// --- LOGIN (Backend Integration) - UPDATED ---
document.getElementById("loginForm")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await makeApiRequest(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, user_type: loginUserType })
    });

    if (response.user) {
      currentUser = response.user;
      document.querySelector(".sidebar").style.display = "none";
      document.querySelector(".main").style.display = "none";
      document.getElementById("appContainer").style.display = "flex";

      // === ROUTING LOGIC BASED ON USER TYPE ===
      if (currentUser.user_type === 'admin') {
        // Admin Login Flow - Show registration form directly
        document.querySelector(".app-sidebar").style.display = "none"; 
        document.getElementById("signOutTrigger").textContent = `Admin: ${currentUser.first_name}`;
        showSection('admin-register-employee'); // <-- CHANGED FROM 'admin-dashboard'

      } else {
        // Employee Login Flow (existing logic)
        fillUserEverywhere(currentUser);
        fetchAndRenderNotifications(currentUser.id);
      }
    } else {
      showCustomAlert(`❌ ${response.message || "Invalid email or password!"}`);
    }
  } catch (error) {
    showCustomAlert(`❌ Login failed: ${error.message}`);
  }
});


// --- Fill Profile, Leave, etc. and update editable fields ---
function fillUserEverywhere(user) {
    const setInputValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                element.value = value || "";
            } else {
                element.textContent = value || "N/A";
            }
        }
    };

    // --- 1. Populate "My Profile" Section ---
    setInputValue("ProfileName", `${user.first_name} ${user.last_name}`);
    setInputValue("welcomeName", user.first_name);
    setInputValue("welcomeName1", `${user.first_name}  ${user.last_name}`);
    setInputValue("edit-firstName", user.first_name);
    setInputValue("edit-lastName", user.last_name);
    setInputValue("edit-gender", user.gender);
    setInputValue("edit-dob", user.dob);
    setInputValue("edit-permanentaddress", user.permanent_address);
    setInputValue("edit-currentaddress", user.current_address);
    setInputValue("edit-pannumber", user.pan_number);
    setInputValue("edit-aadharnumber", user.aadhar_number);
    setInputValue("edit-email", user.email);
    setInputValue("edit-contactnumber", user.contactnumber);
    setInputValue("edit-alternatecontactnumber", user.alternate_contact_number);
    setInputValue("edit-alternatecontactperson", user.alternate_contact_person);
    setInputValue("edit-alternatecontactrelation", user.alternate_contact_relation);
    setInputValue("edit-emergencynumber", user.emergency_number);
    setInputValue("edit-accountnumber", user.account_number);
    setInputValue("edit-ifsccode", user.ifsc_code);
    setInputValue("edit-accountholdername", user.account_holder_name);
    setInputValue("edit-branch", user.branch);
    setInputValue("edit-department", user.department);
    setInputValue("edit-reportingmanager1", user.reporting_manager1);
    setInputValue("edit-reportingmanager2", user.reporting_manager2);
    setInputValue("edit-employeerole", user.employee_role);
    setInputValue("edit-employment_status", user.employment_status);
    setInputValue("edit-joindate", user.join_date);

    // --- 2. Populate General UI Elements ---
    document.querySelectorAll(".username").forEach(el => {
        el.textContent = `${user.first_name} ${user.last_name}`;
    });
    const attendanceNameInput = document.getElementById("attendanceEmployeeName");
    if (attendanceNameInput) {
        attendanceNameInput.value = `${user.first_name} ${user.last_name}`;
    }
    const attendanceDateInput = document.getElementById("attendanceDate");
    if (attendanceDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        attendanceDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // --- 3. Populate ALL THREE Leave Popups ---
    const popups = ['leave', 'wfh', 'compoff'];
    popups.forEach(prefix => {
        setInputValue(`${prefix}-officialmail`, user.email);
        setInputValue(`${prefix}-empcode`, user.id);
        setInputValue(`${prefix}-fullname`, `${user.first_name} ${user.last_name}`);
        setInputValue(`${prefix}-reportingmanager1`, user.reporting_manager1);
        setInputValue(`${prefix}-reportingmanager1mail`, user.reporting_manager1_mail);
        setInputValue(`${prefix}-reportingmanager2`, user.reporting_manager2);
        setInputValue(`${prefix}-reportingmanager2mail`, user.reporting_manager2_mail);
    });
}


// --- Save Profile Changes Function (Backend Integration) ---
async function saveProfileChanges(sectionId) {
    if (!currentUser || !currentUser.id) {
        showCustomAlert("No user is logged in or user ID is missing.");
        return;
    }
    let updatedFields = {};
    let isSaved = false;
    switch (sectionId) {
        case 'personal-details':
            updatedFields = {
                first_name: document.getElementById("edit-firstName").value,
                last_name: document.getElementById("edit-lastName").value,
                gender: document.getElementById("edit-gender").value,
                dob: document.getElementById("edit-dob").value,
                permanent_address: document.getElementById("edit-permanentaddress").value,
                current_address: document.getElementById("edit-currentaddress").value,
                pan_number: document.getElementById("edit-pannumber").value,
                aadhar_number: document.getElementById("edit-aadharnumber").value,
            };
            isSaved = true;
            break;
        case 'contact-details':
            updatedFields = {
                contactnumber: document.getElementById("edit-contactnumber").value,
                alternate_contact_number: document.getElementById("edit-alternatecontactnumber").value,
                alternate_contact_person: document.getElementById("edit-alternatecontactperson").value,
                alternate_contact_relation: document.getElementById("edit-alternatecontactrelation").value,
                emergency_number: document.getElementById("edit-emergencynumber").value,
            };
            isSaved = true;
            break;
        case 'bank-details':
            updatedFields = {
                account_number: document.getElementById("edit-accountnumber").value,
                ifsc_code: document.getElementById("edit-ifsccode").value,
                account_holder_name: document.getElementById("edit-accountholdername").value,
                branch: document.getElementById("edit-branch").value,
            };
            isSaved = true;
            break;
        case 'work-details':
            updatedFields = {
                department: document.getElementById("edit-department").value,
                reporting_manager1: document.getElementById("edit-reportingmanager1").value,
                reporting_manager2: document.getElementById("edit-reportingmanager2").value,
                employee_role: document.getElementById("edit-employeerole").value,
                employment_status: document.getElementById("edit-employment_status").value,
                join_date: document.getElementById("edit-joindate").value,
            };
            isSaved = true;
            break;
    }
    if (isSaved) {
        try {
            console.log(`Attempting to save ${sectionId} changes...`);
            const response = await makeApiRequest(`${API_BASE_URL}/profile/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFields)
            });
            currentUser = response.user;
            toggleSectionEditMode(sectionId, false);
            fillUserEverywhere(currentUser);
            showCustomAlert(`✅ ${sectionId.replace('-', ' ')} updated successfully!`);
            fetchAndRenderNotifications(currentUser.id);
            console.log(`${sectionId} changes saved successfully.`);
        } catch (error) {
            showCustomAlert(`❌ Failed to update ${sectionId.replace('-', ' ')}: ${error.message}`);
            console.error(`Error saving ${sectionId} changes:`, error);
        }
    }
}


// --- Dropdown + Show Login Panel ---
document.querySelector(".dropbtn")?.addEventListener("click", function() {
  document.getElementById("loginDropdown").classList.toggle("show");
});

// --- Close dropdown when clicking outside ---
window.addEventListener("click", function (e) {
  if (!e.target.matches(".dropbtn")) {
    const dd = document.getElementById("loginDropdown");
    if (dd && dd.classList.contains("show")) dd.classList.remove("show");
  }
  const notificationDropdown = document.getElementById('notificationDropdown');
  const bellIcon = document.getElementById('bellIcon');
  if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
      if (!bellIcon.contains(e.target) && !notificationDropdown.contains(e.target)) {
          notificationDropdown.classList.add('hidden');
      }
  }
});

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", function() {
  initializeApplication();
});


// --- Leave/WFH/Comp-off Submission Functions ---
async function submitLeave() {
    const payload = {
        employee_id: currentUser.id,
        leave_type: document.getElementById('leave-type-select').value,
        from_date: document.getElementById('leave-from-date').value,
        to_date: document.getElementById('leave-to-date').value,
        description: document.getElementById('leave-description').value.trim()
    };

    if (!payload.leave_type || !payload.from_date || !payload.to_date) {
        showCustomAlert("Please select a leave type and both dates.");
        return;
    }

    try {
        const response = await makeApiRequest(`${API_BASE_URL}/leave-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showCustomAlert(`✅ ${response.message}`);
        closePopup();
        loadLeaveHistory(currentUser.id);
    } catch (error) {
        showCustomAlert(`❌ Submission failed: ${error.message}`);
    }
}

async function submitWFH() {
    const payload = {
        employee_id: currentUser.id,
        leave_type: 'WFH',
        from_date: document.getElementById('wfh-from-date').value,
        to_date: document.getElementById('wfh-to-date').value,
        description: document.getElementById('wfh-description').value.trim()
    };

    if (!payload.from_date || !payload.to_date) {
        showCustomAlert("Please select both dates.");
        return;
    }

    try {
        const response = await makeApiRequest(`${API_BASE_URL}/leave-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showCustomAlert(`✅ ${response.message}`);
        closePopup1();
        loadLeaveHistory(currentUser.id);
    } catch (error) {
        showCustomAlert(`❌ Submission failed: ${error.message}`);
    }
}

async function submitCompoff() {
    const workDate = document.getElementById('compoff-work-date').value;
    const payload = {
        employee_id: currentUser.id,
        leave_type: 'Comp-off',
        from_date: workDate,
        to_date: workDate,
        description: document.getElementById('compoff-description').value.trim()
    };

    if (!payload.from_date) {
        showCustomAlert("Please select the working date.");
        return;
    }
    
    try {
        const response = await makeApiRequest(`${API_BASE_URL}/leave-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showCustomAlert(`✅ ${response.message}`);
        closePopup2();
        loadLeaveHistory(currentUser.id);
    } catch (error) {
        showCustomAlert(`❌ Submission failed: ${error.message}`);
    }
}

// --- Load and Display Leave History ---
async function loadLeaveHistory(employeeId) {
    const tableBody = document.querySelector('#leaveHistoryTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';

    try {
        const history = await makeApiRequest(`${API_BASE_URL}/leave-applications/${employeeId}`, {
            method: 'GET'
        });
        tableBody.innerHTML = '';
        if (history && history.length > 0) {
            history.forEach(record => {
                const row = tableBody.insertRow();
                row.insertCell(0).textContent = record.leave_type;
                row.insertCell(1).textContent = record.from_date;
                row.insertCell(2).textContent = record.to_date || 'N/A';
                row.insertCell(3).textContent = record.description;
                row.insertCell(4).textContent = record.status;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No history found.</td></tr>';
        }
    } catch (error) {
        console.error("Failed to load leave history:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Could not load history.</td></tr>';
    }
}

// =======================================================
// ====== UI INTERACTIVITY & NEW FEATURES ======
// =======================================================

// --- Functions to navigate the Admin panel ---
function showAdminDashboard() {
    // Show the admin dashboard
    showSection('admin-dashboard');
}

// --- Event listener for the Admin's registration form ---
document.getElementById("adminRegisterForm")?.addEventListener("submit", async function(event) {
    event.preventDefault();
    // This is the same logic as the original register form, but it uses the new IDs
    const formData = {
        first_name: document.getElementById("admin-first_name").value.trim(),
        last_name: document.getElementById("admin-last_name").value.trim(),
        email: document.getElementById("admin-reg_email").value.trim(),
        password: document.getElementById("admin-reg_password").value,
        gender: document.getElementById("admin-gender").value,
        dob: document.getElementById("admin-dob").value,
        permanent_address: document.getElementById("admin-permanent_address").value,
        current_address: document.getElementById("admin-current_address").value,
        pan_number: document.getElementById("admin-pan_number").value,
        aadhar_number: document.getElementById("admin-aadhar_number").value,
        contactnumber: document.getElementById("admin-contactnumber").value,
        alternate_contact_number: document.getElementById("admin-alternate_contact_number").value,
        alternate_contact_person: document.getElementById("admin-alternate_contact_person").value,
        alternate_contact_relation: document.getElementById("admin-alternate_contact_relation").value,
        emergency_number: document.getElementById("admin-emergency_number").value,
        account_number: document.getElementById("admin-account_number").value,
        ifsc_code: document.getElementById("admin-ifsc_code").value,
        account_holder_name: document.getElementById("admin-account_holder_name").value,
        branch: document.getElementById("admin-branch").value,
        department: document.getElementById("admin-department").value,
        reporting_manager1: document.getElementById("admin-reporting_manager1").value,
        reporting_manager1_mail: document.getElementById("admin-reporting_manager1_mail").value,
        reporting_manager2: document.getElementById("admin-reporting_manager2").value,
        reporting_manager2_mail: document.getElementById("admin-reporting_manager2_mail").value,
        employee_role: document.getElementById("admin-employee_role").value,
        employment_status: document.getElementById("admin-employment_status").value,
        join_date: document.getElementById("admin-join_date").value
    };

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) {
        showCustomAlert("❌ Invalid email format");
        return;
    }

    try {
        // The backend endpoint is the same
        const response = await makeApiRequest(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        showCustomAlert(`✅ ${response.message}`);
        this.reset(); // Clear the form for the next registration
    } catch (error) {
        showCustomAlert(`❌ Registration failed: ${error.message}`);
    }
});


// --- Notification Logic ---
async function fetchAndRenderNotifications(employeeId) {
    const dropdown = document.getElementById('notificationDropdown');
    const dot = document.getElementById('notificationDot');
    if (!dropdown || !dot) return;

    try {
        const notifications = await makeApiRequest(`${API_BASE_URL}/notifications/${employeeId}`, { method: 'GET' });
        dropdown.innerHTML = ''; 
        let hasUnread = false;

        if (notifications && notifications.length > 0) {
            notifications.forEach(n => {
                addNotification(n.message, !n.is_read);
                if (!n.is_read) {
                    hasUnread = true;
                }
            });
        } else {
            dropdown.innerHTML = '<div class="notification-item">No new notifications</div>';
        }
        dot.classList.toggle('hidden', !hasUnread);
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        dropdown.innerHTML = '<div class="notification-item">Could not load notifications.</div>';
    }
}

function addNotification(message, isUnread = false) {
    const dropdown = document.getElementById('notificationDropdown');
    const newItem = document.createElement('div');
    newItem.className = 'notification-item';
    if (isUnread) {
        newItem.classList.add('unread');
    }
    newItem.textContent = message;
    dropdown.appendChild(newItem);
}

async function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    const dot = document.getElementById('notificationDot');
    dropdown.classList.toggle('hidden');

    if (!dropdown.classList.contains('hidden') && !dot.classList.contains('hidden')) {
        dot.classList.add('hidden');
        dropdown.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
        try {
            await makeApiRequest(`${API_BASE_URL}/notifications/mark-read/${currentUser.id}`, { method: 'PUT' });
        } catch (error) {
            console.error("Failed to mark notifications as read:", error);
            dot.classList.remove('hidden');
        }
    }
}


// --- Forgot Password Logic (for login screen) ---
function showForgotPasswordPopup() {
    document.getElementById('forgotPasswordPopup').style.display = 'flex';
}
function closeForgotPasswordPopup() {
    document.getElementById('forgotPasswordPopup').style.display = 'none';
}

document.getElementById('forgotPasswordForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    if (!email) {
        showCustomAlert('Please enter your email address.');
        return;
    }
    
    try {
        const response = await makeApiRequest(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        showCustomAlert(response.message);
        closeForgotPasswordPopup();
    } catch (error) {
        showCustomAlert(`❌ An error occurred: ${error.message}`);
    }
});

// --- Sidebar Navigation ---
const sections = document.querySelectorAll("main.profilee-section > section");
const navLinks = document.querySelectorAll(".app-sidebar ul li");

function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.add("hidden");
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove("hidden");
        if (sectionId === 'events') {
            const eventContentSections = document.querySelectorAll("#events .content-section");
            eventContentSections.forEach(s => s.classList.add("hidden"));
            const menuButtons = document.getElementById("menuButtons");
            if (menuButtons) {
                menuButtons.style.display = "flex";
            }
        }
        if (sectionId === 'timings' && currentUser) {
            loadAttendanceRecords(currentUser.id);
        }
         // Load history when the section is shown
        if (sectionId === 'leave-application' && currentUser) {
            loadLeaveHistory(currentUser.id);
        }
    }
}

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    const sectionId = link.getAttribute("data-section");
    showSection(sectionId);
  });
});

// --- Profile Page Accordions ---
const accordions = document.querySelectorAll(".accordion");
accordions.forEach(accordion => {
    const header = accordion.querySelector(".accordion-header");
    header.addEventListener("click", (e) => {
        // Prevent toggling when clicking a button or its icon inside the header
        if (e.target.closest('button')) return;

        const body = accordion.querySelector(".accordion-body");
        const icon = header.querySelector("i.fa-chevron-down"); 
        
        if (body.style.display === "block") {
            body.style.display = "none";
            if (icon) icon.style.transform = "rotate(0deg)";
        } else {
            body.style.display = "block";
            if (icon) icon.style.transform = "rotate(180deg)";
        }
    });
});


// --- Custom Alert/Confirm ---
function showCustomAlert(message, isConfirm = false) {
    const alertOverlay = document.getElementById('customAlert');
    const alertMessage = document.getElementById('customAlertMessage');
    const closeBtn = document.getElementById('customAlertCloseBtn');
    const cancelBtn = document.getElementById('customConfirmCancelBtn');
    if (!alertOverlay || !alertMessage || !closeBtn) {
        console.error("Custom alert elements not found.");
        alert(message);
        return;
    }
    alertMessage.textContent = message;
    alertOverlay.style.display = 'flex';
    closeBtn.textContent = isConfirm ? 'Yes' : 'OK';
    cancelBtn.style.display = isConfirm ? 'inline-block' : 'none';
    return new Promise((resolve) => {
        const handleClose = () => {
            alertOverlay.style.display = 'none';
            closeBtn.removeEventListener('click', handleClose);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        const handleCancel = () => {
            alertOverlay.style.display = 'none';
            closeBtn.removeEventListener('click', handleClose);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        closeBtn.addEventListener('click', handleClose);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// --- Leave Balance Details ---
function showLeaveDetails(sectionId) {
    const allSections = document.querySelectorAll('.profilee-section > section');
    allSections.forEach(section => {
        if (section.id !== 'leave-balance') section.classList.add('hidden');
    });
    document.getElementById('leave-balance').classList.add('hidden');
    const detailSection = document.getElementById(sectionId);
    if (detailSection) {
        detailSection.classList.remove('hidden');
    }
}

function showMainLeaveBalance() {
    document.getElementById('leave-balance-details').classList.add('hidden');
    document.getElementById('wfh-details').classList.add('hidden');
    document.getElementById('compoff-details').classList.add('hidden');
    const leaveBalanceSection = document.getElementById('leave-balance');
    if (leaveBalanceSection) {
        leaveBalanceSection.classList.remove('hidden');
    }
}
window.showLeaveDetails = showLeaveDetails;
window.showMainLeaveBalance = showMainLeaveBalance;

// --- Popup Management for Leave Application ---
function openPopup(id = 'popupOverlay') { document.getElementById(id).style.display = 'flex'; }
function closePopup(id = 'popupOverlay') { document.getElementById(id).style.display = 'none'; }
window.openPopup = openPopup;
window.closePopup = closePopup;
window.openPopup1 = () => openPopup('popupOverlay1');
window.closePopup1 = () => closePopup('popupOverlay1');
window.openPopup2 = () => openPopup('popupOverlay2');
window.closePopup2 = () => closePopup('popupOverlay2');
window.openPopup3 = () => openPopup('popupOverlay3');
window.closePopup3 = () => closePopup('popupOverlay3');

// --- Events Section Logic ---
const menuButtons = document.getElementById("menuButtons");
const contentSections = document.querySelectorAll(".content-section");

function showEventsSubSection(subSectionId) {
    const sectionToShow = document.getElementById(subSectionId);
    if (sectionToShow) {
        menuButtons.style.display = "none";
        // Hide all content sections by adding the .hidden class
        contentSections.forEach(s => {
            s.classList.add("hidden");
        });
        // Show the target section by REMOVING the .hidden class
        sectionToShow.classList.remove("hidden");
    }
}
window.showEventsSubSection = showEventsSubSection;

function goBack() {
  menuButtons.style.display = "flex";
  contentSections.forEach(s => s.classList.add("hidden"));
}
function toggleSearchBox(bodyId, iconId) {
    const searchBody = document.getElementById(bodyId);
    const icon = document.getElementById(iconId);
    if (searchBody.style.display === 'none' || searchBody.style.display === '') {
        searchBody.style.display = 'block';
        icon.textContent = '▲';
    } else {
        searchBody.style.display = 'none';
        icon.textContent = '▼';
    }
}
window.toggleSearchBox = toggleSearchBox;

// --- Sign Out Functionality ---
document.getElementById("signOutTrigger")?.addEventListener("click", async () => {
  if (await showCustomAlert("Are you sure you want to sign out?", true)) {
    currentUser = null;
    window.location.reload();
  }
});

// --- ATTENDANCE LOGIC ---
function addAttendanceRow(record) {
    const tableBody = document.querySelector('#attendanceTable tbody');
    if (!tableBody) return;
    const newRow = tableBody.insertRow(0);
    newRow.setAttribute('data-record-id', record.record_id);
    newRow.insertCell(0).textContent = record.date;
    newRow.insertCell(1).textContent = record.login_time;
    newRow.insertCell(2).textContent = record.employee_name;
    newRow.insertCell(3).textContent = record.work_location;
    const actionCell = newRow.insertCell(4);
    const logoutTimeCell = newRow.insertCell(5);
    if (record.logout_time) {
        actionCell.textContent = '';
        logoutTimeCell.textContent = record.logout_time;
    } else {
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.className = 'btn btn-logout';
        logoutButton.onclick = () => recordLogout(record.record_id, newRow);
        actionCell.appendChild(logoutButton);
        logoutTimeCell.textContent = 'Active';
    }
}

document.getElementById("recordLoginBtn")?.addEventListener("click", async () => {
    if (!currentUser || !currentUser.id) {
        showCustomAlert("Please log in to record attendance.");
        return;
    }
    const attendanceDate = document.getElementById("attendanceDate").value;
    const attendanceEmployeeName = document.getElementById("attendanceEmployeeName").value;
    const attendanceWorkLocation = document.getElementById("attendanceWorkLocation").value;
    if (!attendanceDate || attendanceWorkLocation === "-select-") {
        showCustomAlert("Please select a valid date and work location.");
        return;
    }
    try {
        const response = await makeApiRequest(`${API_BASE_URL}/attendance/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_id: currentUser.id,
                date: attendanceDate,
                employee_name: attendanceEmployeeName,
                work_location: attendanceWorkLocation
            })
        });
        if (response.record) {
            addAttendanceRow(response.record);
            showCustomAlert(`✅ Login recorded at ${response.record.login_time} for ${attendanceWorkLocation}`);
        } else {
            showCustomAlert(`❌ Failed to record login: ${response.message || "Unknown error"}`);
        }
    } catch (error) {
        showCustomAlert(`❌ Error recording login: ${error.message}`);
        console.error("Error recording login:", error);
    }
});

async function recordLogout(recordId, rowElement) {
    if (!currentUser || !currentUser.id) {
        showCustomAlert("Please log in to record attendance.");
        return;
    }
    const confirmLogout = await showCustomAlert("Are you sure you want to record logout for this session?", true);
    if (!confirmLogout) return;
    try {
        const response = await makeApiRequest(`${API_BASE_URL}/attendance/logout/${recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.logout_time) {
            const actionCell = rowElement.cells[4];
            const logoutTimeCell = rowElement.cells[5];
            actionCell.innerHTML = '';
            logoutTimeCell.textContent = response.logout_time;
            showCustomAlert(`✅ Logout recorded at ${response.logout_time}`);
        } else {
            showCustomAlert(`❌ Failed to record logout: ${response.message || "Unknown error"}`);
        }
    } catch (error) {
        showCustomAlert(`❌ Error recording logout: ${error.message}`);
        console.error("Error recording logout:", error);
    }
}

async function loadAttendanceRecords(employeeId) {
    const tableBody = document.querySelector('#attendanceTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Loading attendance records...</td></tr>';
    try {
        const records = await makeApiRequest(`${API_BASE_URL}/attendance/${employeeId}`, {
            method: 'GET'
        });
        tableBody.innerHTML = '';
        if (records && records.length > 0) {
            records.forEach(record => {
                addAttendanceRow(record);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">No attendance records found.</td></tr>';
        }
    } catch (error) {
        showCustomAlert(`❌ Error loading attendance records: ${error.message}`);
        console.error("Error loading attendance records:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="color:red;">Failed to load attendance records.</td></tr>';
    }
}

// --- Handle 'Change Password' Form ---
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!currentUser) {
        showCustomAlert('❌ You must be logged in to change your password.');
        return;
    }

    const currentPassword = document.getElementById('change-current-password').value;
    const newPassword = document.getElementById('change-new-password').value;
    const confirmPassword = document.getElementById('change-confirm-password').value;

    if (newPassword.length < 8) {
        showCustomAlert('❌ New password must be at least 8 characters long.');
        return;
    }
    if (newPassword !== confirmPassword) {
        showCustomAlert('❌ New passwords do not match.');
        return;
    }

    try {
        const response = await makeApiRequest(`${API_BASE_URL}/profile/change-password/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_password: currentPassword,
                new_password: newPassword
            })
        });

        if (response.message === "Incorrect old password") {
             showCustomAlert(`❌ Password change failed: ${response.message}`);
        } else if (response.message === "Password updated successfully!") {
            showCustomAlert('✅ Your password has been updated successfully.');
            fetchAndRenderNotifications(currentUser.id);
            this.reset();
        } else {
            showCustomAlert(`❌ Password change failed: ${response.message || 'An unknown error occurred.'}`);
        }

    } catch (error) {
        showCustomAlert(`❌ An error occurred: ${error.message}`);
    }
});

// --- Handle 'Reset Password' Form ---
document.getElementById('internalResetPasswordForm')?.addEventListener('submit', async function(event) {
    event.preventDefault();

    if (!currentUser) {
        showCustomAlert('❌ You must be logged in to reset your password.');
        return;
    }

    const newPassword = document.getElementById('internal-reset-new-password').value;
    const confirmPassword = document.getElementById('internal-reset-confirm-password').value;

    if (newPassword.length < 8) {
        showCustomAlert('❌ New password must be at least 8 characters long.');
        return;
    }
    if (newPassword !== confirmPassword) {
        showCustomAlert('❌ New passwords do not match.');
        return;
    }

    try {
        const response = await makeApiRequest(`${API_BASE_URL}/profile/reset-password-internal/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_password: newPassword
            })
        });

        if (response.message === "Password reset successfully!") {
            showCustomAlert('✅ Your password has been reset successfully.');
            fetchAndRenderNotifications(currentUser.id);
            this.reset();
        } else {
            showCustomAlert(`❌ Password reset failed: ${response.message || 'An unknown error occurred.'}`);
        }

    } catch (error) {
        showCustomAlert(`❌ An error occurred: ${error.message}`);
    }
});