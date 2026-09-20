(function () {
  'use strict';

  // --- Session Token Management ---
  const SESSION_KEY = 'pulse_session_token';
  function getSessionToken() {
    let token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      token = 'sess_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, token);
    }
    return token;
  }
  const sessionToken = getSessionToken();

  // --- DOM Elements ---
  const form = document.getElementById('donor-form');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');
  const submitSpinner = document.getElementById('submit-spinner');
  const formAlert = document.getElementById('form-alert');
  const formHeading = document.getElementById('form-heading');
  const formSubheading = document.getElementById('form-subheading');
  const formModeIndicator = document.getElementById('form-mode-indicator');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  // Active Profile Banner
  const activeProfileBanner = document.getElementById('active-profile-banner');
  const viewBloodGroup = document.getElementById('view-bloodGroup');
  const viewName = document.getElementById('view-name');
  const viewLocation = document.getElementById('view-location');
  const viewAvailabilityTag = document.getElementById('view-availability-tag');
  const quickAvailSwitch = document.getElementById('quick-avail-switch');
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const sessionStatusText = document.getElementById('session-status-text');

  // Search & Directory
  const donorList = document.getElementById('donor-list');
  const searchBloodGroup = document.getElementById('search-bloodGroup');
  const searchCity = document.getElementById('search-city');
  const searchState = document.getElementById('search-state');
  const searchAvailableOnly = document.getElementById('search-availableOnly');
  const searchBtn = document.getElementById('search-btn');
  const searchResetBtn = document.getElementById('search-reset-btn');
  const btnRefreshList = document.getElementById('btn-refresh-list');

  let currentProfile = null;
  let formMode = 'create'; // 'create' | 'edit'

  // --- Helpers ---
  function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    };
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
    document.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    formAlert.textContent = '';
    formAlert.className = 'form-alert hidden';
  }

  function showFieldErrors(fields) {
    Object.entries(fields).forEach(([fieldName, message]) => {
      const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
      if (errorEl) errorEl.textContent = message;

      const inputEl = document.querySelector(`[name="${fieldName}"]`);
      if (inputEl) inputEl.classList.add('is-invalid');
    });
  }

  function showAlert(message, type = 'error') {
    formAlert.textContent = message;
    formAlert.className = `form-alert ${type}`;
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Profile Banner & Mode Management ---
  function renderActiveProfile(profile) {
    if (!profile) {
      activeProfileBanner.classList.add('hidden');
      sessionStatusText.textContent = 'Guest Session';
      return;
    }

    currentProfile = profile;
    viewBloodGroup.textContent = profile.bloodGroup;
    viewName.textContent = profile.name;
    viewLocation.textContent = `${profile.city || ''}, ${profile.state || ''} &middot; PIN: ${profile.pinCode || ''}`;
    
    const isAvail = profile.available && profile.eligibleNow;
    if (isAvail) {
      viewAvailabilityTag.textContent = 'Available';
      viewAvailabilityTag.className = 'status-tag status-available';
    } else {
      viewAvailabilityTag.textContent = 'Not Available';
      viewAvailabilityTag.className = 'status-tag status-unavailable';
    }

    quickAvailSwitch.checked = Boolean(profile.available);
    sessionStatusText.textContent = `Donor: ${profile.name.split(' ')[0]}`;
    activeProfileBanner.classList.remove('hidden');
  }

  function enterEditMode() {
    if (!currentProfile) return;
    formMode = 'edit';
    formHeading.textContent = 'Update Donor Profile';
    formSubheading.textContent = 'Modify your contact information, location, or donation status.';
    submitBtnText.textContent = 'Save Changes';
    formModeIndicator.classList.remove('hidden');
    btnCancelEdit.classList.remove('hidden');

    // Populate form fields
    form.name.value = currentProfile.name || '';
    form.bloodGroup.value = currentProfile.bloodGroup || '';
    form.weightKg.value = currentProfile.weightKg || '';
    form.phone.value = currentProfile.phone || '';
    form.altPhone.value = currentProfile.altPhone || '';
    form.email.value = currentProfile.email || '';
    form.address.value = currentProfile.address || '';
    form.city.value = currentProfile.city || '';
    form.state.value = currentProfile.state || '';
    form.pinCode.value = currentProfile.pinCode || '';
    form.lastDonationDate.value = currentProfile.lastDonationDate || '';
    form.available.checked = Boolean(currentProfile.available);

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exitEditMode() {
    formMode = 'create';
    formHeading.textContent = 'Donor Profile Form';
    formSubheading.textContent = 'Fill in your profile details to register as an emergency blood donor.';
    submitBtnText.textContent = 'Save Donor Profile';
    formModeIndicator.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
    form.reset();
    form.available.checked = true;
    clearErrors();
  }

  // --- API Calls ---
  async function fetchCurrentProfile() {
    try {
      const res = await fetch('/api/donor/profile', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.donor) {
          renderActiveProfile(data.donor);
        }
      }
    } catch (err) {
      console.warn('Could not fetch active profile:', err);
    }
  }

  async function updateAvailability(newStatus) {
    try {
      const res = await fetch('/api/donor/profile', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ available: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.donor) {
        renderActiveProfile(data.donor);
        showAlert(`Availability set to: ${newStatus ? 'Available' : 'Unavailable'}`, 'success');
        loadDonors();
      } else {
        quickAvailSwitch.checked = !newStatus; // revert
        showAlert(data.error || 'Failed to update availability', 'error');
      }
    } catch (err) {
      quickAvailSwitch.checked = !newStatus;
      showAlert('Network error updating availability', 'error');
    }
  }

  // --- Form Submission Handler (SCRUM-14 to SCRUM-17) ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    // Client-side quick boundary validation check
    const rawWeight = parseFloat(form.weightKg.value);
    if (!isNaN(rawWeight) && rawWeight < 50) {
      showFieldErrors({ weightKg: 'Donors must weigh at least 50 kg to be eligible (SCRUM-17 standard).' });
      showAlert('Eligibility standard requirement: Weight must be at least 50 kg.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitSpinner.classList.remove('hidden');

    const payload = {
      name: form.name.value.trim(),
      bloodGroup: form.bloodGroup.value,
      weightKg: form.weightKg.value,
      phone: form.phone.value.trim(),
      altPhone: form.altPhone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      state: form.state.value.trim(),
      pinCode: form.pinCode.value.trim(),
      lastDonationDate: form.lastDonationDate.value,
      available: form.available.checked,
    };

    const endpoint = '/api/donor/profile';
    const method = formMode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          showFieldErrors(data.fields);
        }
        showAlert(data.error || 'Please correct the highlighted errors.', 'error');
        return;
      }

      // Success
      showAlert(
        formMode === 'edit'
          ? `Profile updated successfully for ${data.donor.name}!`
          : `Profile created successfully! Thank you for registering, ${data.donor.name}.`,
        'success'
      );

      renderActiveProfile(data.donor);
      exitEditMode();
      loadDonors();
    } catch (err) {
      showAlert('Network error. Failed to reach the server.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('hidden');
    }
  });

  // --- Directory Rendering ---
  function renderDonors(donors) {
    donorList.innerHTML = '';
    if (!donors || donors.length === 0) {
      donorList.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon">🔍</span>
          <p><strong>No donors match your search criteria.</strong></p>
          <p>Try clearing filters or register a new donor profile above.</p>
        </div>
      `;
      return;
    }

    donors.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'donor-card';

      const isAvail = d.available && d.eligibleNow;
      const cleanPhone = (d.phone || '').replace(/[^0-9+]/g, '');

      card.innerHTML = `
        <div class="donor-card-top">
          <div class="donor-blood-tag">${escapeHtml(d.bloodGroup)}</div>
          <div class="donor-primary-info">
            <h4>${escapeHtml(d.name)}</h4>
            <div class="donor-location">
              📍 ${escapeHtml(d.city || '')}${d.state ? ', ' + escapeHtml(d.state) : ''}
            </div>
          </div>
        </div>

        <div class="donor-details-row">
          <div class="donor-detail-pill">
            <span>Weight:</span>
            <strong>${escapeHtml(d.weightKg)} kg</strong>
          </div>
          ${d.lastDonationDate ? `
            <div class="donor-detail-pill">
              <span>Last Donated:</span>
              <strong>${escapeHtml(d.lastDonationDate)}</strong>
            </div>
          ` : `
            <div class="donor-detail-pill">
              <span>Status:</span>
              <strong>First-time / Ready</strong>
            </div>
          `}
        </div>

        <div class="donor-card-footer">
          <span class="status-tag ${isAvail ? 'status-available' : 'status-unavailable'}">
            ${isAvail ? 'Available to Donate' : 'Unavailable'}
          </span>
          ${cleanPhone ? `
            <a href="tel:${cleanPhone}" class="donor-call-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Contact
            </a>
          ` : ''}
        </div>
      `;
      donorList.appendChild(card);
    });
  }

  async function loadDonors() {
    const params = new URLSearchParams();
    if (searchBloodGroup.value) params.set('bloodGroup', searchBloodGroup.value);
    if (searchCity.value.trim()) params.set('city', searchCity.value.trim());
    if (searchState.value.trim()) params.set('state', searchState.value.trim());
    if (searchAvailableOnly.checked) params.set('availableOnly', 'true');

    try {
      const res = await fetch(`/api/donors?${params.toString()}`);
      const data = await res.json();
      renderDonors(data.donors || []);
    } catch (err) {
      donorList.innerHTML = '<div class="empty-state"><p>Could not reach the server to load donors.</p></div>';
    }
  }

  // --- Event Listeners ---
  btnEditProfile.addEventListener('click', enterEditMode);
  btnCancelEdit.addEventListener('click', exitEditMode);
  quickAvailSwitch.addEventListener('change', (e) => {
    updateAvailability(e.target.checked);
  });

  searchBtn.addEventListener('click', loadDonors);
  searchResetBtn.addEventListener('click', () => {
    searchBloodGroup.value = '';
    searchCity.value = '';
    searchState.value = '';
    searchAvailableOnly.checked = true;
    loadDonors();
  });
  btnRefreshList.addEventListener('click', loadDonors);

  // Clear specific field errors on user input
  form.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      const errEl = document.querySelector(`[data-error-for="${input.name}"]`);
      if (errEl) errEl.textContent = '';
    });
  });

  // --- Initial Load ---
  fetchCurrentProfile();
  loadDonors();
})();
