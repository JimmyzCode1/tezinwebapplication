/**
 * Saxion Deventer | VR & Interior Design Portal
 * Core Client-side Controller (SPA Router, Calendar, Inventory & LocalStorage Sync)
 */

// Initial Mock Inventory Configuration
const INITIAL_INVENTORY = {
    q3: {
        name: "Meta Quest 3",
        total: 5,
        available: 4, // Default available
        colorClass: "q3-color"
    },
    q2: {
        name: "Meta Quest 2",
        total: 4,
        available: 3, // Default available
        colorClass: "q2-color"
    }
};

// Application State
let state = {
    inventory: {},
    loans: [],
    appointments: [],
    selectedHeadset: null,
    selectedBookingType: 'consultation',
    currentCalendarDate: new Date(),
    selectedApptDate: null,
    selectedApptTime: null
};

// DOM Elements
const views = document.querySelectorAll('.view-section');
const navLinks = document.querySelectorAll('.nav-link');
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');
const badgeCount = document.getElementById('bookings-count-badge');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initLocalStorage();
    initRouter();
    initMobileMenu();
    updateInventoryUI();
    renderMyPortal();
    
    // Set up default date inputs for lending
    setupLendingDateInputs();
    
    // Set up calendar
    initCalendar();
});

// --- LOCAL STORAGE STATE MANAGEMENT ---
function initLocalStorage() {
    // Inventory
    if (!localStorage.getItem('saxion_vr_inventory')) {
        localStorage.setItem('saxion_vr_inventory', JSON.stringify(INITIAL_INVENTORY));
    }
    state.inventory = JSON.parse(localStorage.getItem('saxion_vr_inventory'));

    // Loans
    if (!localStorage.getItem('saxion_vr_loans')) {
        localStorage.setItem('saxion_vr_loans', JSON.stringify([]));
    }
    state.loans = JSON.parse(localStorage.getItem('saxion_vr_loans'));

    // Appointments
    if (!localStorage.getItem('saxion_vr_appointments')) {
        localStorage.setItem('saxion_vr_appointments', JSON.stringify([]));
    }
    state.appointments = JSON.parse(localStorage.getItem('saxion_vr_appointments'));
    
    updateBadgeCount();
}

function saveState() {
    localStorage.setItem('saxion_vr_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('saxion_vr_loans', JSON.stringify(state.loans));
    localStorage.setItem('saxion_vr_appointments', JSON.stringify(state.appointments));
    updateBadgeCount();
    updateInventoryUI();
}

function updateBadgeCount() {
    const totalBookings = state.loans.length + state.appointments.length;
    if (totalBookings > 0) {
        badgeCount.textContent = totalBookings;
        badgeCount.style.display = 'inline-block';
    } else {
        badgeCount.style.display = 'none';
    }
}

// --- SPA ROUTER & DYNAMIC TRANSITIONS ---
function initRouter() {
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashRouting);
    
    // Set up nav click handlers
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const hash = link.getAttribute('href');
            
            // Update hash which triggers handleHashRouting
            window.location.hash = hash;
            
            // Close mobile menu if open
            navMenu.classList.remove('open');
            const icon = menuToggle.querySelector('i');
            icon.className = 'fa-solid fa-bars';
        });
    });

    // Run router on first load
    handleHashRouting();
}

function handleHashRouting() {
    const hash = window.location.hash || '#dashboard';
    let targetViewId = 'dashboard-view';
    
    // Map hash to view section ID
    if (hash === '#lending') targetViewId = 'lending-view';
    else if (hash === '#booking') targetViewId = 'booking-view';
    else if (hash === '#my-bookings') targetViewId = 'my-bookings-view';
    
    switchView(targetViewId);
}

function switchView(viewId) {
    // Hide all views and remove active class
    views.forEach(view => {
        view.classList.remove('active-view');
    });
    
    // Show target view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active-view');
    }
    
    // Update active nav link styling
    navLinks.forEach(link => {
        const linkTarget = link.getAttribute('data-target');
        if (linkTarget === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Scroll smoothly to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile Menu toggler
function initMobileMenu() {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        const isOpen = navMenu.classList.contains('open');
        const icon = menuToggle.querySelector('i');
        
        if (isOpen) {
            icon.className = 'fa-solid fa-xmark';
        } else {
            icon.className = 'fa-solid fa-bars';
        }
    });
}

// --- DYNAMIC INVENTORY & STOCK RENDERING ---
function updateInventoryUI() {
    // Update Dashboard stock bars and texts
    for (const key in state.inventory) {
        const item = state.inventory[key];
        const pct = (item.available / item.total) * 100;
        
        const bar = document.getElementById(`${key}-stock-bar`);
        const text = document.getElementById(`${key}-stock-text`);
        const catalogPill = document.getElementById(`catalog-${key}-stock`);
        
        if (bar) {
            bar.style.width = `${pct}%`;
        }
        if (text) {
            text.textContent = `${item.available} / ${item.total} available`;
        }
        
        // Catalog stock pill
        if (catalogPill) {
            if (item.available > 0) {
                catalogPill.textContent = `${item.available} available`;
                catalogPill.classList.remove('out-of-stock');
            } else {
                catalogPill.textContent = `Fully Loaned`;
                catalogPill.classList.add('out-of-stock');
            }
        }
    }
}

// --- VR LENDING PROCESS CONTROLLER ---
function selectHeadset(id) {
    const cardQ3 = document.getElementById('card-q3');
    const cardQ2 = document.getElementById('card-q2');
    const form = document.getElementById('lending-form');
    const inputs = form.querySelectorAll('input, button');
    const subtitle = document.querySelector('#lending-booking-panel .panel-subtitle');
    
    // Clear selections
    cardQ3.classList.remove('selected');
    cardQ2.classList.remove('selected');
    
    // Check if item is available
    if (state.inventory[id].available <= 0) {
        showToast("Hardware Unavailable", `All ${state.inventory[id].name} headsets are currently loaned out.`, "warning");
        state.selectedHeadset = null;
        form.classList.add('disabled-form');
        inputs.forEach(input => input.disabled = true);
        subtitle.textContent = "Select an available headset first to configure rental details";
        return;
    }
    
    // Select clicked
    state.selectedHeadset = id;
    document.getElementById(`card-${id}`).classList.add('selected');
    document.getElementById('selected-headset-id').value = id;
    
    // Enable form
    form.classList.remove('disabled-form');
    inputs.forEach(input => input.disabled = false);
    subtitle.innerHTML = `Lending: <strong style="color:var(--primary);">${state.inventory[id].name}</strong>`;
}

function setupLendingDateInputs() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    // Min start date is today
    const today = new Date();
    const todayStr = formatDateISO(today);
    startDateInput.min = todayStr;
    
    // Set default pickup date to today
    startDateInput.value = todayStr;
    
    // Set default return date to 3 days later
    const defaultReturn = addWorkingDays(today, 3);
    endDateInput.value = formatDateISO(defaultReturn);
    endDateInput.min = todayStr;
    
    // Limit end date to max 3 working days from selected start date
    startDateInput.addEventListener('change', () => {
        const chosenStart = new Date(startDateInput.value);
        endDateInput.min = formatDateISO(chosenStart);
        
        const maxReturn = addWorkingDays(chosenStart, 3);
        endDateInput.value = formatDateISO(maxReturn);
    });
}

function submitLendingForm(event) {
    event.preventDefault();
    
    if (!state.selectedHeadset) return;
    
    const id = state.selectedHeadset;
    const name = document.getElementById('borrower-name').value;
    const studentNum = document.getElementById('student-number').value;
    const studentEmail = document.getElementById('student-email').value;
    const startStr = document.getElementById('start-date').value;
    const endStr = document.getElementById('end-date').value;
    
    // Date calculations
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (end < start) {
        showToast("Invalid Dates", "Return date cannot be before pickup date.", "warning");
        return;
    }
    
    // Validate maximum 3 working days loan
    const dayDiff = getWorkingDaysDiff(start, end);
    if (dayDiff > 3) {
        showToast("Date Constraint", "The maximum borrowing limit is 3 working days. Please select an earlier return date.", "warning");
        return;
    }
    
    // Deduct stock
    if (state.inventory[id].available > 0) {
        state.inventory[id].available--;
    } else {
        showToast("Stock Alert", "This item has run out of stock during your configuration.", "warning");
        return;
    }
    
    // Save loan item
    const loanRecord = {
        id: 'loan-' + Date.now(),
        headsetId: id,
        headsetName: state.inventory[id].name,
        borrowerName: name,
        studentNumber: studentNum,
        studentEmail: studentEmail,
        startDate: formatDateFriendly(start),
        endDate: formatDateFriendly(end),
        endRaw: endStr,
        status: 'Pending Pickup'
    };
    
    state.loans.push(loanRecord);
    saveState();
    renderMyPortal();

    // Construct Mailto Email to labid.hbs@saxion.nl
    const subject = `VR Headset Reservation - ${loanRecord.headsetName} - ${studentNum}`;
    const emailBody = `Dear VR Lab Team,

I would like to reserve a VR headset. Here are my details:

Name: ${name}
Student Number: ${studentNum}
Student Email: ${studentEmail}

Requested Headset: ${loanRecord.headsetName}
Pickup Date: ${loanRecord.startDate}
Return Date: ${loanRecord.endDate}

I have read and agree to return the hardware complete, clean, and within the 3-day term.

Kind regards,
${name}`;

    const mailtoUrl = `mailto:labid.hbs@saxion.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Reset selections and forms
    document.getElementById(`card-${id}`).classList.remove('selected');
    state.selectedHeadset = null;
    document.getElementById('lending-form').reset();
    document.getElementById('lending-form').classList.add('disabled-form');
    document.getElementById('lending-booking-panel').querySelector('.panel-subtitle').textContent = "Select a headset first to configure rental details";
    const inputs = document.getElementById('lending-form').querySelectorAll('input, button');
    inputs.forEach(input => input.disabled = true);
    
    setupLendingDateInputs(); // Reset date boundaries
    
    // Display Success Toast
    showToast(
        "Reservation Created!", 
        `Your Meta Quest reservation is saved. A draft email to labid.hbs@saxion.nl has been opened to submit your request.`, 
        "success"
    );

    // Open email client after a brief delay so they see the toast
    setTimeout(() => {
        window.location.href = mailtoUrl;
    }, 1200);
}

// --- APPOINTMENT BOOKING PROCESS & CALENDAR GENERATOR ---
function selectBookingType(type) {
    const cards = document.querySelectorAll('.booking-option-card');
    cards.forEach(card => card.classList.remove('active'));
    
    const selectedCard = document.querySelector(`.booking-option-card[data-type="${type}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    
    state.selectedBookingType = type;
    document.getElementById('selected-appt-type').value = type;
    
    // Update preview banner
    const titles = {
        consultation: "VR Technical Support",
        review: "Interior Design VR Review",
        space: "VR Lab Studio Space"
    };
    document.getElementById('preview-type-title').textContent = titles[type];
    
    // Regenerate slots if date is selected
    if (state.selectedApptDate) {
        generateTimeSlots(state.selectedApptDate);
    }
}

function initCalendar() {
    const prevBtn = document.getElementById('prev-month-btn');
    const nextBtn = document.getElementById('next-month-btn');
    
    prevBtn.addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextBtn.addEventListener('click', () => {
        state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid-days');
    const label = document.getElementById('calendar-month-year');
    
    grid.innerHTML = '';
    
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();
    
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    
    label.textContent = `${monthNames[month]} ${year}`;
    
    // First day of month (1-indexed day, but we need day of week index)
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust for Monday first layout (Mon=0, Tue=1, ..., Sun=6)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    // Today check
    const today = new Date();
    
    // 1. Previous Month Days (Grayed out)
    for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevTotalDays - i;
        const cell = document.createElement('div');
        cell.className = 'calendar-day other-month';
        cell.textContent = day;
        grid.appendChild(cell);
    }
    
    // 2. Current Month Days
    for (let d = 1; d <= totalDays; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = d;
        
        const thisDate = new Date(year, month, d);
        
        // Check if date is today
        if (thisDate.toDateString() === today.toDateString()) {
            cell.classList.add('today');
        }
        
        // Disable conditions (past dates & Sundays)
        const isPast = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isSunday = thisDate.getDay() === 0;
        
        if (isPast || isSunday) {
            cell.classList.add('disabled');
        } else {
            // Clickable day
            cell.addEventListener('click', () => {
                // Clear previous selection
                document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
                cell.classList.add('selected');
                
                state.selectedApptDate = thisDate;
                document.getElementById('selected-appt-date').value = formatDateISO(thisDate);
                document.getElementById('selected-date-label').textContent = formatDateFriendly(thisDate);
                
                generateTimeSlots(thisDate);
            });
            
            // Preserve selected styling during month switching
            if (state.selectedApptDate && thisDate.toDateString() === state.selectedApptDate.toDateString()) {
                cell.classList.add('selected');
            }
        }
        
        grid.appendChild(cell);
    }
    
    // 3. Next Month Days (Grayed out)
    const gridCellsFilled = startOffset + totalDays;
    const nextDaysNeeded = gridCellsFilled % 7 === 0 ? 0 : 7 - (gridCellsFilled % 7);
    for (let n = 1; n <= nextDaysNeeded; n++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day other-month';
        cell.textContent = n;
        grid.appendChild(cell);
    }
}

function generateTimeSlots(date) {
    const container = document.getElementById('time-slots-grid');
    container.innerHTML = '';
    
    // Fixed daily slots
    const standardSlots = [
        "09:00 - 09:45",
        "10:30 - 11:15",
        "13:00 - 13:45",
        "14:30 - 15:15",
        "15:30 - 16:15"
    ];
    
    // Seed randomness for disabled slots based on date to feel dynamic yet consistent
    const seed = date.getDate() + date.getMonth();
    
    standardSlots.forEach((slot, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-slot-btn';
        btn.textContent = slot.split(" - ")[0]; // Just show starting time e.g., "09:00"
        
        // Randomly disable 1 or 2 slots per day based on date seed
        const isDisabled = (seed + index) % 4 === 0;
        
        if (isDisabled) {
            btn.classList.add('disabled');
            btn.title = "Slot already booked";
        } else {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-slot-btn.selected').forEach(el => el.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedApptTime = slot;
                document.getElementById('selected-appt-time').value = slot;
                
                // Update preview banner text
                const formattedDate = formatDateFriendly(date);
                document.getElementById('preview-date-time').innerHTML = `Scheduled: <strong>${formattedDate}</strong> at <strong>${slot}</strong>`;
                
                // Enable contact form details
                enableAppointmentForm();
            });
            
            // Re-select on refresh/re-rendering
            if (state.selectedApptTime === slot) {
                btn.classList.add('selected');
            }
        }
        
        container.appendChild(btn);
    });
}

function enableAppointmentForm() {
    const formStep = document.getElementById('wizard-form-step');
    formStep.classList.remove('disabled-step');
    
    const inputs = formStep.querySelectorAll('input, textarea, button');
    inputs.forEach(input => input.disabled = false);
}

function submitAppointmentForm(event) {
    event.preventDefault();
    
    if (!state.selectedApptDate || !state.selectedApptTime) {
        showToast("Missing Selection", "Please select both a date and a time slot first.", "warning");
        return;
    }
    
    const name = document.getElementById('appt-name').value;
    const studentNum = document.getElementById('appt-student-number').value;
    const studentEmail = document.getElementById('appt-email').value;
    const notes = document.getElementById('appt-notes').value;
    const type = state.selectedBookingType;
    
    const apptNames = {
        consultation: "VR Technical Support",
        review: "Interior Design VR Review",
        space: "VR Lab Studio Space"
    };
    
    const newAppt = {
        id: 'appt-' + Date.now(),
        type: type,
        typeName: apptNames[type],
        name: name,
        studentNumber: studentNum,
        studentEmail: studentEmail,
        notes: notes,
        date: formatDateFriendly(state.selectedApptDate),
        dateRaw: formatDateISO(state.selectedApptDate),
        time: state.selectedApptTime,
        location: type === 'space' ? "Deventer VR Lab (Room D2.18)" : "Deventer Library consultation corner"
    };
    
    state.appointments.push(newAppt);
    saveState();
    renderMyPortal();

    // Construct Mailto Email to labid.hbs@saxion.nl
    const subject = `VR Lab Appointment - ${newAppt.typeName} - ${studentNum}`;
    const emailBody = `Dear VR Lab Team,

I would like to book a VR Lab session. Here are my details:

Name: ${name}
Student Number: ${studentNum}
Student Email: ${studentEmail}

Appointment Type: ${newAppt.typeName}
Date: ${newAppt.date}
Time Slot: ${newAppt.time}
Location: ${newAppt.location}

Additional Notes/Questions:
${notes || 'None'}

Kind regards,
${name}`;

    const mailtoUrl = `mailto:labid.hbs@saxion.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Clear and reset wizard
    document.getElementById('appointment-form').reset();
    
    // Reset wizard view state
    state.selectedApptDate = null;
    state.selectedApptTime = null;
    document.getElementById('selected-appt-date').value = '';
    document.getElementById('selected-appt-time').value = '';
    document.getElementById('selected-date-label').textContent = 'Select a date';
    document.getElementById('preview-date-time').textContent = 'Select date & time on left to preview';
    
    // Reset calendar render
    renderCalendar();
    document.getElementById('time-slots-grid').innerHTML = '<p class="no-date-hint">Please select a date on the calendar first.</p>';
    
    // Disable form fields
    const formStep = document.getElementById('wizard-form-step');
    formStep.classList.add('disabled-step');
    const inputs = formStep.querySelectorAll('input, textarea, button');
    inputs.forEach(input => input.disabled = true);
    
    // Show success toast
    showToast(
        "Appointment Booked!", 
        `Your reservation is saved. A draft email to labid.hbs@saxion.nl has been opened to submit your request.`, 
        "success"
    );

    // Open email client after a brief delay
    setTimeout(() => {
        window.location.href = mailtoUrl;
    }, 1200);
}

// --- PORTAL DATA MANAGER & LOCAL STORAGE RENDERER ---
function renderMyPortal() {
    const loansList = document.getElementById('loans-list');
    const apptsList = document.getElementById('appointments-list');
    
    // 1. Render Headset Loans
    if (state.loans.length === 0) {
        loansList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <p>No active headset reservations.</p>
                <button class="btn btn-sm btn-outline" onclick="switchView('lending-view')">Lend a headset</button>
            </div>
        `;
    } else {
        loansList.innerHTML = '';
        state.loans.forEach(loan => {
            const itemCard = document.createElement('div');
            itemCard.className = 'booking-item-card loan-item';
            
            // Overdue check (simple simulation: if endRaw is before today, mark red border)
            const todayStr = formatDateISO(new Date());
            const isOverdue = loan.endRaw < todayStr;
            if (isOverdue) {
                itemCard.classList.add('loan-overdue');
            }
            
            itemCard.innerHTML = `
                <div class="item-left">
                    <div class="item-badge-icon"><i class="fa-solid fa-vr-cardboard"></i></div>
                    <div class="item-details">
                        <h4>${loan.headsetName}</h4>
                        <p><i class="fa-regular fa-calendar"></i> Pickup: ${loan.startDate} &bull; Return: ${loan.endDate}</p>
                        <p style="font-size:0.78rem;"><i class="fa-regular fa-user"></i> Student: ${loan.borrowerName} (${loan.studentNumber})</p>
                        <span class="item-status ${isOverdue ? 'status-pending' : 'status-active'}">
                            <i class="fa-solid ${isOverdue ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> 
                            ${isOverdue ? 'Overdue - Return immediately' : loan.status}
                        </span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-cancel-btn" onclick="cancelLoan('${loan.id}')">
                        <i class="fa-regular fa-trash-can"></i> Cancel
                    </button>
                </div>
            `;
            loansList.appendChild(itemCard);
        });
    }
    
    // 2. Render Lab Appointments
    if (state.appointments.length === 0) {
        apptsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-calendar-minus"></i>
                <p>No upcoming appointments scheduled.</p>
                <button class="btn btn-sm btn-outline" onclick="switchView('booking-view')">Book a session</button>
            </div>
        `;
    } else {
        apptsList.innerHTML = '';
        state.appointments.forEach(appt => {
            const itemCard = document.createElement('div');
            itemCard.className = 'booking-item-card appt-item';
            
            itemCard.innerHTML = `
                <div class="item-left">
                    <div class="item-badge-icon"><i class="fa-regular fa-calendar-check"></i></div>
                    <div class="item-details">
                        <h4>${appt.typeName}</h4>
                        <p><i class="fa-regular fa-clock"></i> ${appt.date} &bull; ${appt.time.split(" - ")[0]}</p>
                        <p style="font-size:0.75rem;"><i class="fa-solid fa-location-dot"></i> Location: ${appt.location}</p>
                        <span class="item-status status-teams"><i class="fa-solid fa-video"></i> Teams link sent</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-cancel-btn" onclick="cancelAppointment('${appt.id}')">
                        <i class="fa-regular fa-trash-can"></i> Cancel
                    </button>
                </div>
            `;
            apptsList.appendChild(itemCard);
        });
    }
}

function cancelLoan(id) {
    const index = state.loans.findIndex(l => l.id === id);
    if (index === -1) return;
    
    const loan = state.loans[index];
    const headsetId = loan.headsetId;
    
    // Replenish stock
    if (state.inventory[headsetId]) {
        state.inventory[headsetId].available = Math.min(
            state.inventory[headsetId].total,
            state.inventory[headsetId].available + 1
        );
    }
    
    // Remove loan
    state.loans.splice(index, 1);
    saveState();
    renderMyPortal();
    
    showToast(
        "Reservation Cancelled", 
        `Your loan reservation for ${loan.headsetName} has been successfully cancelled and stock returned.`, 
        "info"
    );
}

function cancelAppointment(id) {
    const index = state.appointments.findIndex(a => a.id === id);
    if (index === -1) return;
    
    const appt = state.appointments[index];
    
    // Remove appointment
    state.appointments.splice(index, 1);
    saveState();
    renderMyPortal();
    
    showToast(
        "Appointment Cancelled", 
        `Your ${appt.typeName} on ${appt.date} at ${appt.time} has been successfully cancelled.`, 
        "info"
    );
}

// --- UTILITY TOAST NOTIFICATIONS ---
function showToast(title, message, type = "success") {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-solid fa-circle-check',
        warning: 'fa-solid fa-triangle-exclamation',
        info: 'fa-solid fa-circle-info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="${icons[type]}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Automatically remove after 4.5 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 4500);
}

// --- DATE CALCULATIONS UTILITIES (Working days only, excluding Sundays) ---
function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateFriendly(date) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const dayName = days[date.getDay()];
    const mName = months[date.getMonth()];
    const d = date.getDate();
    const y = date.getFullYear();
    
    return `${dayName}, ${d} ${mName} ${y}`;
}

// Add working days (skipping Sundays, Campus Library is usually closed on Sundays)
function addWorkingDays(startDate, daysToAdd) {
    let date = new Date(startDate.getTime());
    let added = 0;
    while (added < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0) { // If it's not Sunday, count it
            added++;
        }
    }
    return date;
}

// Count working days between two dates (excluding Sundays)
function getWorkingDaysDiff(startDate, endDate) {
    const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    let days = 0;
    let current = new Date(s.getTime());
    
    while (current <= e) {
        if (current.getDay() !== 0) { // Not Sunday
            days++;
        }
        current.setDate(current.getDate() + 1);
    }
    return days - 1; // Return interval diff
}
