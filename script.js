async function syncToTeams(orderData) {
    try {
        console.log('🔄 Syncing to Teams...', orderData);
        
        const response = await fetch('/api/sync-to-teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            console.log('✅ Teams sync successful');
        } else {
            console.warn('⚠️ Teams sync failed (order still saved)');
        }
    } catch (error) {
        console.error('❌ Teams sync error:', error);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Inverter dropdown options
const INVERTER_TYPES = ['3PH HYD', '1PH HYD', '1PH OFG'];
const INVERTER_MODELS = [
    'SunPunch Basic','SunPunch Basic Pro','SunPunch Premium','SunPunch Premium Pro',
    'SunPunch TriMax','SunCumulus Basic','SunCumulus Basic Pro','SunCumulus Premium',
    'SunCumulus Premium Pro','SunPunch TriMax','E-Cumulus Basic','E-Cumulus Basic Pro',
    'E-Cumulus Premium','E-Cumulus Premium Pro','SunSense','SunGrab'
];

// Bind behavior between select and text input so "Others" enables typing
function setupInverterSelectBehavior(root = document) {
    // Main form selects
    const typeSelect = root.querySelector('#inverterTypeSelect');
    const typeInput = root.querySelector('#inverterType');
    if (typeSelect && typeInput) {
        // initialize state
        if (typeInput.value && INVERTER_TYPES.indexOf(typeInput.value) === -1) {
            typeSelect.value = 'Others';
            typeInput.readOnly = false;
        } else if (typeInput.value) {
            typeSelect.value = typeInput.value;
            typeInput.readOnly = true;
        } else {
            typeInput.readOnly = false;
        }

        typeSelect.addEventListener('change', () => {
            if (typeSelect.value === 'Others') {
                typeInput.value = '';
                typeInput.readOnly = false;
                typeInput.focus();
            } else {
                typeInput.value = typeSelect.value || '';
                typeInput.readOnly = true;
            }
        });
    }

    const modelSelect = root.querySelector('#modelNoSelect');
    const modelInput = root.querySelector('#modelNo');
    if (modelSelect && modelInput) {
        if (modelInput.value && INVERTER_MODELS.indexOf(modelInput.value) === -1) {
            modelSelect.value = 'Others';
            modelInput.readOnly = false;
        } else if (modelInput.value) {
            modelSelect.value = modelInput.value;
            modelInput.readOnly = true;
        } else {
            modelInput.readOnly = false;
        }

        modelSelect.addEventListener('change', () => {
            if (modelSelect.value === 'Others') {
                modelInput.value = '';
                modelInput.readOnly = false;
                modelInput.focus();
            } else {
                modelInput.value = modelSelect.value || '';
                modelInput.readOnly = true;
            }
        });
    }

    // For edit forms: selects with class .edit-inverter-select targeting an edit input by data-field
    const editSelects = root.querySelectorAll ? root.querySelectorAll('.edit-inverter-select') : [];
    editSelects.forEach(sel => {
        const field = sel.dataset.field;
        const input = sel.closest('.record-item') ? sel.closest('.record-item').querySelector(`.edit-input[data-field="${field}"]`) : null;
        if (!input) return;

        sel.addEventListener('change', () => {
            if (sel.value === 'Others') {
                input.value = '';
                input.readOnly = false;
                input.focus();
            } else {
                input.value = sel.value || '';
                input.readOnly = true;
            }
        });

        // initialize
        if (input.value && (INVERTER_TYPES.indexOf(input.value) === -1 && INVERTER_MODELS.indexOf(input.value) === -1)) {
            sel.value = 'Others';
            input.readOnly = false;
        } else if (input.value) {
            sel.value = input.value;
            input.readOnly = true;
        }
    });
}

// Initialize all components
function initializeApp() {
    // Set today's date as default for order receive date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderReceiveDate').value = today;

    // Load and display records
    loadRecords();

    // Initialize all autocomplete fields
    initializeAllAutocompletes();

    // Setup inverter select behavior for main form
    setupInverterSelectBehavior(document);

    // Calculate total amount on order value or quantity change
    document.getElementById('orderValue').addEventListener('input', calculateTotalAmount);
    document.getElementById('quantity').addEventListener('input', calculateTotalAmount);

    // Form submission
    document.getElementById('dataForm').addEventListener('submit', handleFormSubmit);

    // Clear form button
    document.getElementById('clearForm').addEventListener('click', clearForm);

    // Filter change
    document.getElementById('filterType').addEventListener('change', loadRecords);

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
}

// Calculate total amount (Order Value * Quantity)
function calculateTotalAmount() {
    const orderValue = parseFloat(document.getElementById('orderValue').value) || 0;
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const totalAmount = orderValue * quantity;
    document.getElementById('totalAmount').value = totalAmount.toFixed(2);
}

// Initialize all autocomplete fields
function initializeAllAutocompletes() {
    const autocompleteFields = [
        'workOrderNo', 'dealer', 'customerName', 'poNo', 'marketingLead',
        'inverterType', 'inverterTypeBattery', 'modelNo', 'rating',
        'state', 'city', 'phoneCode', 'pinCode', 'gstNo'
    ];

    autocompleteFields.forEach(fieldId => {
        initAutocomplete(fieldId);
    });
}

// Generic autocomplete initialization
function initAutocomplete(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    const suggestions = document.getElementById(fieldId + 'Suggestions');
    if (!suggestions) return;

    let selectedIndex = -1;

    input.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        const allValues = getUniqueValues(fieldId);
        
        if (value.length === 0) {
            suggestions.innerHTML = '';
            suggestions.classList.remove('show');
            return;
        }

        const filtered = allValues.filter(val => 
            val.toLowerCase().includes(value) && val.toLowerCase() !== value
        );

        if (filtered.length === 0) {
            suggestions.innerHTML = '';
            suggestions.classList.remove('show');
            return;
        }

        suggestions.innerHTML = filtered.slice(0, 5).map(val => {
            const highlighted = escapeHtml(val).replace(
                new RegExp(`(${escapeRegex(value)})`, 'gi'),
                '<strong>$1</strong>'
            );
            return `<div class="suggestion-item" data-value="${escapeHtml(val)}">${highlighted}</div>`;
        }).join('');

        suggestions.classList.add('show');
        selectedIndex = -1;

        const suggestionItems = suggestions.querySelectorAll('.suggestion-item');
        suggestionItems.forEach((item, index) => {
            item.addEventListener('click', function() {
                input.value = this.dataset.value;
                suggestions.classList.remove('show');
                input.focus();
            });

            item.addEventListener('mouseenter', function() {
                suggestionItems.forEach(i => i.classList.remove('highlighted'));
                this.classList.add('highlighted');
                selectedIndex = index;
            });
        });
    });

    input.addEventListener('keydown', function(e) {
        if (!suggestions.classList.contains('show')) return;

        const items = suggestions.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            items.forEach(i => i.classList.remove('highlighted'));
            if (selectedIndex >= 0) {
                items[selectedIndex].classList.add('highlighted');
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            items.forEach(i => i.classList.remove('highlighted'));
            if (selectedIndex >= 0) {
                items[selectedIndex].classList.add('highlighted');
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            input.value = items[selectedIndex].dataset.value;
            suggestions.classList.remove('show');
            selectedIndex = -1;
        } else if (e.key === 'Escape') {
            suggestions.classList.remove('show');
            selectedIndex = -1;
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('show');
        }
    });
}

// Get unique values for a field
function getUniqueValues(fieldId) {
    const records = getRecords();
    const values = records.map(record => {
        const value = record[fieldId];
        return value ? String(value).trim() : '';
    }).filter(val => val.length > 0);
    return [...new Set(values)].sort();
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const record = {
        id: Date.now().toString(),
        // workOrderNo: formData.get('workOrderNo'),
        orderReceiveDate: formData.get('orderReceiveDate'),
        dealer: formData.get('dealer'),
        customerName: formData.get('customerName'),
        poNo: formData.get('poNo'),
        orderValue: parseFloat(formData.get('orderValue')) || 0,
        quantity: parseFloat(formData.get('quantity')) || 0,
        totalAmount: parseFloat(formData.get('totalAmount')) || 0,
        marketingLead: formData.get('marketingLead'),
        quantityProduct: formData.get('quantityProduct') || '',
        inverterType: formData.get('inverterType') || '',
        blocks: formData.get('blocks') || '',
        inverterTypeBattery: formData.get('inverterTypeBattery') || '',
        modelNo: formData.get('modelNo') || '',
        rating: formData.get('rating') || '',
        targetDispatchDate: formData.get('targetDispatchDate'),
        address: formData.get('address') || '',
        state: formData.get('state') || '',
        city: formData.get('city') || '',
        phoneCode: formData.get('phoneCode') || '',
        pinCode: formData.get('pinCode') || '',
        Email: formData.get('Email') || '',
        gstNo: formData.get('gstNo') || '',
        createdAt: new Date().toISOString()
    };

    // Save record to localStorage
    saveRecord(record);

    // Show notification
    showNotification('Work order created successfully!', 'success');

    // Clear form but keep date
    clearForm(true);

    // Reload records
    loadRecords();

    syncToTeams(record);
}

// Save record to localStorage
function saveRecord(record) {
    let records = getRecords();
    records.push(record);
    localStorage.setItem('workOrders', JSON.stringify(records));
}

// Get all records from localStorage
function getRecords() {
    const records = localStorage.getItem('workOrders');
    return records ? JSON.parse(records) : [];
}

// Helper function to normalize date string (YYYY-MM-DD)
function normalizeDate(dateString) {
    if (!dateString) return '';
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get today's date string
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get start of week (Monday)
function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
}

// Load and display records based on filter
function loadRecords() {
    const filterType = document.getElementById('filterType').value;
    const allRecords = getRecords();
    let filteredRecords = allRecords;

    const now = new Date();
    const todayStr = getTodayString();

    switch (filterType) {
        case 'today':
            filteredRecords = allRecords.filter(record => {
                const recordDateStr = normalizeDate(record.orderReceiveDate);
                return recordDateStr === todayStr;
            });
            break;
        case 'week':
            const weekStart = getStartOfWeek();
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
            const weekEndStr = normalizeDate(weekEnd.toISOString().split('T')[0]);
            
            filteredRecords = allRecords.filter(record => {
                const recordDateStr = normalizeDate(record.orderReceiveDate);
                return recordDateStr >= weekStart && recordDateStr <= weekEndStr;
            });
            break;
        case 'month':
            filteredRecords = allRecords.filter(record => {
                const recordDate = new Date(record.orderReceiveDate + 'T00:00:00');
                return recordDate.getMonth() === now.getMonth() && 
                       recordDate.getFullYear() === now.getFullYear();
            });
            break;
        case 'year':
            filteredRecords = allRecords.filter(record => {
                const recordDate = new Date(record.orderReceiveDate + 'T00:00:00');
                return recordDate.getFullYear() === now.getFullYear();
            });
            break;
    }

    // Sort records by date (newest first)
    filteredRecords.sort((a, b) => new Date(b.orderReceiveDate + 'T00:00:00') - new Date(a.orderReceiveDate + 'T00:00:00'));

    displayRecords(filteredRecords);
    updateRecordCount(filteredRecords.length, allRecords.length);
}

// Display records in the UI
function displayRecords(records) {
    const recordsList = document.getElementById('recordsList');

    if (records.length === 0) {
        recordsList.innerHTML = '<div class="empty-state"><p>No work orders found for the selected filter.</p></div>';
        return;
    }

    recordsList.innerHTML = records.map(record => createRecordHTML(record)).join('');
}

// Create HTML for a single record
function createRecordHTML(record, isEditMode = false) {
    if (isEditMode) {
        return createEditModeHTML(record);
    }
    
    const receiveDate = formatDate(record.orderReceiveDate);
    const dispatchDate = record.targetDispatchDate ? formatDate(record.targetDispatchDate) : 'Not set';
    
    return `
        <div class="record-item" data-id="${record.id}">
            <div class="record-header">
                <div class="record-title-section">
                    
                    <div class="record-subtitle">Customer: ${escapeHtml(record.customerName)}</div>
                    <div class="record-meta">
                        <span>Receive Date: ${receiveDate}</span>
                        <span>Dispatch Date: ${dispatchDate}</span>
                    </div>
                </div>
                <div class="record-actions">
                    <button class="btn-edit" onclick="toggleEditMode('${record.id}')">Edit</button>
                </div>
            </div>
            
            <div class="record-content">
                <div class="record-section">
                    <h4>Order Information</h4>
                    <div class="record-grid">
                        <div class="record-field">
                            <span class="field-label">Dealer:</span>
                            <span class="field-value">${escapeHtml(record.dealer)}</span>
                        </div>
                        <div class="record-field">
                            <span class="field-label">PO No:</span>
                            <span class="field-value">${escapeHtml(record.poNo)}</span>
                        </div>
                        <div class="record-field">
                            <span class="field-label">Marketing Lead:</span>
                            <span class="field-value">${escapeHtml(record.marketingLead)}</span>
                        </div>
                        <div class="record-field">
                            <span class="field-label">Order Value:</span>
                            <span class="field-value">₹${parseFloat(record.orderValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="record-field">
                            <span class="field-label">Quantity:</span>
                            <span class="field-value">${escapeHtml(record.quantity)}</span>
                        </div>
                        <div class="record-field">
                            <span class="field-label">Total Amount:</span>
                            <span class="field-value highlight">₹${parseFloat(record.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                ${record.inverterType || record.modelNo || record.blocks ? `
                <div class="record-section">
                    <h4>Product Details</h4>
                    <div class="record-grid">
                        ${record.inverterType ? `<div class="record-field"><span class="field-label">Inverter Type:</span><span class="field-value">${escapeHtml(record.inverterType)}</span></div>` : ''}
                        ${record.blocks ? `<div class="record-field"><span class="field-label">Blocks:</span><span class="field-value">${escapeHtml(record.blocks)}</span></div>` : ''}
                        ${record.inverterTypeBattery ? `<div class="record-field"><span class="field-label">Battery Type:</span><span class="field-value">${escapeHtml(record.inverterTypeBattery)}</span></div>` : ''}
                        ${record.modelNo ? `<div class="record-field"><span class="field-label">Model No:</span><span class="field-value">${escapeHtml(record.modelNo)}</span></div>` : ''}
                        ${record.rating ? `<div class="record-field"><span class="field-label">Rating:</span><span class="field-value">${escapeHtml(record.rating)}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}

                ${record.address || record.city || record.state ? `
                <div class="record-section">
                    <h4>Customer Details</h4>
                    <div class="record-grid">
                        ${record.address ? `<div class="record-field full-width"><span class="field-label">Address:</span><span class="field-value">${escapeHtml(record.address)}</span></div>` : ''}
                        ${record.city ? `<div class="record-field"><span class="field-label">City:</span><span class="field-value">${escapeHtml(record.city)}</span></div>` : ''}
                        ${record.state ? `<div class="record-field"><span class="field-label">State:</span><span class="field-value">${escapeHtml(record.state)}</span></div>` : ''}
                        ${record.pinCode ? `<div class="record-field"><span class="field-label">PIN Code:</span><span class="field-value">${escapeHtml(record.pinCode)}</span></div>` : ''}
                        ${record.phoneCode ? `<div class="record-field"><span class="field-label">Phone Code:</span><span class="field-value">${escapeHtml(record.phoneCode)}</span></div>` : ''}
                        ${record.Email ? `<div class="record-field"><span class="field-label">Email:</span><span class="field-value">${escapeHtml(record.Email)}</span></div>` : ''}
                        ${record.gstNo ? `<div class="record-field"><span class="field-label">GST No:</span><span class="field-value">${escapeHtml(record.gstNo)}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}

                ${record.quantityProduct ? `<div class="record-section"><h4>Technical Details</h4><p class="record-text">${escapeHtml(record.quantityProduct)}</p></div>` : ''}
            </div>
        </div>
    `;
}

// Create HTML for edit mode
function createEditModeHTML(record) {
    return `
        <div class="record-item record-item-edit" data-id="${record.id}">
            <div class="edit-form">
                <div class="edit-header">
                    <h3>Edit Work Order</h3>
                </div>
                <form class="edit-record-form" onsubmit="saveRecordEdit('${record.id}'); return false;">
                    <div class="form-section-title">Order Information</div>
                    <div class="edit-grid">
                        <div class="edit-field">
                            <label>Work Order No. *</label>
                            <input type="text" class="edit-input" data-field="workOrderNo" value="${escapeHtml(record.workOrderNo)}" required>
                        </div>
                        <div class="edit-field">
                            <label>Order Receive Date *</label>
                            <input type="date" class="edit-input" data-field="orderReceiveDate" value="${record.orderReceiveDate}" required>
                        </div>
                        <div class="edit-field">
                            <label>Dealer *</label>
                            <input type="text" class="edit-input" data-field="dealer" value="${escapeHtml(record.dealer)}" required>
                        </div>
                        <div class="edit-field">
                            <label>Customer Name</label>
                            <input type="text" class="edit-input" data-field="customerName" value="${escapeHtml(record.customerName || '')}">
                        </div>
                        <div class="edit-field">
                            <label>PO No. *</label>
                            <input type="text" class="edit-input" data-field="poNo" value="${escapeHtml(record.poNo)}" required>
                        </div>
                        <div class="edit-field">
                            <label>Order Value (₹) *</label>
                            <input type="number" class="edit-input" data-field="orderValue" value="${record.orderValue}" min="0" step="0.01" required>
                        </div>
                        <div class="edit-field">
                            <label>Quantity *</label>
                            <input type="number" class="edit-input" data-field="quantity" value="${record.quantity}" min="1" step="0.01" required>
                        </div>
                        <div class="edit-field">
                            <label>Total Amount (₹) *</label>
                            <input type="number" class="edit-input" data-field="totalAmount" value="${record.totalAmount}" readonly>
                        </div>
                        <div class="edit-field">
                            <label>Marketing Lead *</label>
                            <input type="text" class="edit-input" data-field="marketingLead" value="${escapeHtml(record.marketingLead)}" required>
                        </div>
                        <div class="edit-field">
                            <label>Target Dispatch Date *</label>
                            <input type="date" class="edit-input" data-field="targetDispatchDate" value="${record.targetDispatchDate || ''}" required>
                        </div>
                    </div>

                    <div class="form-section-title">Product & Technical Details</div>
                    <div class="edit-grid">
                        <div class="edit-field full-width">
                            <label>Quantity Product / Technical Details</label>
                            <textarea class="edit-input" data-field="quantityProduct" rows="2">${escapeHtml(record.quantityProduct || '')}</textarea>
                        </div>
                        <div class="edit-field">
                            <label>Inverter Type *</label>
                            <select class="edit-inverter-select" data-field="inverterType">
                                <option value="">Select Inverter Type</option>
                                <option value="3PH HYD">3PH HYD</option>
                                <option value="1PH HYD">1PH HYD</option>
                                <option value="1PH OFG">1PH OFG</option>
                                <option value="Others">Others</option>
                            </select>
                            <input type="text" class="edit-input" data-field="inverterType" value="${escapeHtml(record.inverterType || '')}" required>
                        </div>
                        <div class="edit-field">
                            <label>Blocks *</label>
                            <select class="edit-input" data-field="blocks" required>
                                <option value="">Select Block</option>
                                <option value="A" ${record.blocks === 'A' ? 'selected' : ''}>Block A</option>
                                <option value="B" ${record.blocks === 'B' ? 'selected' : ''}>Block B</option>
                                <option value="C" ${record.blocks === 'C' ? 'selected' : ''}>Block C</option>
                                <option value="A,B" ${record.blocks === 'A,B' ? 'selected' : ''}>Block A, B</option>
                                <option value="A,C" ${record.blocks === 'A,C' ? 'selected' : ''}>Block A, C</option>
                                <option value="B,C" ${record.blocks === 'B,C' ? 'selected' : ''}>Block B, C</option>
                                <option value="A,B,C" ${record.blocks === 'A,B,C' ? 'selected' : ''}>Block A, B, C</option>
                            </select>
                        </div>
                        <div class="edit-field">
                            <label>Inverter Type Battery *</label>
                            <input type="text" class="edit-input" data-field="inverterTypeBattery" value="${escapeHtml(record.inverterTypeBattery || '')}" required>
                        </div>
                        <div class="edit-field">
                            <label>Model No. *</label>
                            <select class="edit-inverter-select" data-field="modelNo">
                                <option value="">Select Model</option>
                                <option>SunPunch Basic</option>
                                <option>SunPunch Basic Pro</option>
                                <option>SunPunch Premium</option>
                                <option>SunPunch Premium Pro</option>
                                <option>SunPunch TriMax</option>
                                <option>SunCumulus Basic</option>
                                <option>SunCumulus Basic Pro</option>
                                <option>SunCumulus Premium</option>
                                <option>SunCumulus Premium Pro</option>
                                <option>SunPunch TriMax</option>
                                <option>E-Cumulus Basic</option>
                                <option>E-Cumulus Basic Pro</option>
                                <option>E-Cumulus Premium</option>
                                <option>E-Cumulus Premium Pro</option>
                                <option>SunSense</option>
                                <option>SunGrab</option>
                                <option value="Others">Others</option>
                            </select>
                            <input type="text" class="edit-input" data-field="modelNo" value="${escapeHtml(record.modelNo || '')}" required>
                        </div>
                        <div class="edit-field">
                            <label>Rating *</label>
                            <input type="text" class="edit-input" data-field="rating" value="${escapeHtml(record.rating || '')}" required>
                        </div>
                    </div>

                    <div class="form-section-title">Customer Details</div>
                    <div class="edit-grid">
                        <div class="edit-field">
                            <label>Customer Name</label>
                            <input type="text" class="edit-input" data-field="customerName" value="${escapeHtml(record.customerName || '')}">
                        </div>
                        <div class="edit-field full-width">
                            <label>Address</label>
                            <textarea class="edit-input" data-field="address" rows="2">${escapeHtml(record.address || '')}</textarea>
                        </div>
                        <div class="edit-field">
                            <label>State</label>
                            <input type="text" class="edit-input" data-field="state" value="${escapeHtml(record.state || '')}">
                        </div>
                        <div class="edit-field">
                            <label>City</label>
                            <input type="text" class="edit-input" data-field="city" value="${escapeHtml(record.city || '')}">
                        </div>
                        <div class="edit-field">
                            <label>Phone Code</label>
                            <input type="text" class="edit-input" data-field="phoneCode" value="${escapeHtml(record.phoneCode || '')}">
                        </div>
                        <div class="edit-field">
                            <label>PIN Code</label>
                            <input type="text" class="edit-input" data-field="pinCode" value="${escapeHtml(record.pinCode || '')}">
                        </div>
                         <div class="edit-field">
                            <label>Email</label>
                            <input type="text" class="edit-input" data-field="Email" value="${escapeHtml(record.Email || '')}">
                        </div>
                        <div class="edit-field">
                            <label>GST No.</label>
                            <input type="text" class="edit-input" data-field="gstNo" value="${escapeHtml(record.gstNo || '')}">
                        </div>
                    </div>

                    <div class="edit-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelEditMode('${record.id}')">Cancel</button>
                        <button type="button" class="btn btn-danger" onclick="deleteWorkOrder('${record.id}')">Delete Work Order</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Toggle edit mode for a record
function toggleEditMode(recordId) {
    const records = getRecords();
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const recordElement = document.querySelector(`.record-item[data-id="${recordId}"]`);
    if (recordElement) {
        recordElement.outerHTML = createEditModeHTML(record);
        
        // Setup calculation for order value and quantity
        const orderValueInput = document.querySelector(`.record-item[data-id="${recordId}"] .edit-input[data-field="orderValue"]`);
        const quantityInput = document.querySelector(`.record-item[data-id="${recordId}"] .edit-input[data-field="quantity"]`);
        const totalAmountInput = document.querySelector(`.record-item[data-id="${recordId}"] .edit-input[data-field="totalAmount"]`);
        
        if (orderValueInput && quantityInput && totalAmountInput) {
            const calculateTotal = () => {
                const orderValue = parseFloat(orderValueInput.value) || 0;
                const quantity = parseFloat(quantityInput.value) || 0;
                totalAmountInput.value = (orderValue * quantity).toFixed(2);
            };
            
            orderValueInput.addEventListener('input', calculateTotal);
            quantityInput.addEventListener('input', calculateTotal);
        }
        // Setup inverter select behavior inside this edit form
        const newRecordEl = document.querySelector(`.record-item[data-id="${recordId}"]`);
        if (newRecordEl) setupInverterSelectBehavior(newRecordEl);
    }
}

// Cancel edit mode
function cancelEditMode(recordId) {
    const records = getRecords();
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const recordElement = document.querySelector(`.record-item[data-id="${recordId}"]`);
    if (recordElement) {
        recordElement.outerHTML = createRecordHTML(record, false);
    }
}

// Save record edit
function saveRecordEdit(recordId) {
    const records = getRecords();
    const recordIndex = records.findIndex(r => r.id === recordId);
    if (recordIndex === -1) return;

    const recordElement = document.querySelector(`.record-item[data-id="${recordId}"]`);
    if (!recordElement) return;

    const inputs = recordElement.querySelectorAll('.edit-input');
    const updatedRecord = { ...records[recordIndex] };
    
    let isValid = true;
    inputs.forEach(input => {
        const field = input.dataset.field;
        let value;
        
        if (input.type === 'number') {
            value = input.hasAttribute('readonly') ? parseFloat(input.value) || 0 : parseFloat(input.value) || 0;
        } else {
            value = input.value.trim();
        }
        
        if (input.hasAttribute('required') && !value && input.type !== 'number') {
            isValid = false;
            input.style.borderColor = 'var(--danger-color)';
        } else {
            input.style.borderColor = '';
            updatedRecord[field] = value;
        }
        
        if (input.hasAttribute('required') && input.type === 'number' && (!value || value <= 0)) {
            isValid = false;
            input.style.borderColor = 'var(--danger-color)';
        }
    });

    if (!isValid) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }

    // Recalculate total amount
    updatedRecord.totalAmount = (updatedRecord.orderValue || 0) * (updatedRecord.quantity || 0);

    updatedRecord.updatedAt = new Date().toISOString();
    records[recordIndex] = updatedRecord;
    localStorage.setItem('workOrders', JSON.stringify(records));

    showNotification('Work order updated successfully!', 'success');
    recordElement.outerHTML = createRecordHTML(updatedRecord, false);
    loadRecords(); // Refresh to maintain filter
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Not set';
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Update record count display
function updateRecordCount(filteredCount, totalCount) {
    const recordCount = document.getElementById('recordCount');
    const filterType = document.getElementById('filterType').value;
    
    if (filterType === 'all') {
        recordCount.textContent = `Total Work Orders: ${totalCount}`;
    } else {
        recordCount.textContent = `Showing ${filteredCount} of ${totalCount} total work orders`;
    }
}

// Clear form
function clearForm(keepDate = false) {
    const form = document.getElementById('dataForm');
    form.reset();
    
    if (keepDate) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('orderReceiveDate').value = today;
    }
    
    document.getElementById('totalAmount').value = '';
}

// Export filtered records to CSV
function exportToCSV() {
    const filterType = document.getElementById('filterType').value;
    const allRecords = getRecords();
    let filteredRecords = allRecords;

    const now = new Date();
    const todayStr = getTodayString();

    switch (filterType) {
        case 'today':
            filteredRecords = allRecords.filter(record => {
                const recordDateStr = normalizeDate(record.orderReceiveDate);
                return recordDateStr === todayStr;
            });
            break;
        case 'week':
            const weekStart = getStartOfWeek();
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
            const weekEndStr = normalizeDate(weekEnd.toISOString().split('T')[0]);
            
            filteredRecords = allRecords.filter(record => {
                const recordDateStr = normalizeDate(record.orderReceiveDate);
                return recordDateStr >= weekStart && recordDateStr <= weekEndStr;
            });
            break;
        case 'month':
            filteredRecords = allRecords.filter(record => {
                const recordDate = new Date(record.orderReceiveDate + 'T00:00:00');
                return recordDate.getMonth() === now.getMonth() && 
                       recordDate.getFullYear() === now.getFullYear();
            });
            break;
        case 'year':
            filteredRecords = allRecords.filter(record => {
                const recordDate = new Date(record.orderReceiveDate + 'T00:00:00');
                return recordDate.getFullYear() === now.getFullYear();
            });
            break;
    }

    if (filteredRecords.length === 0) {
        showNotification('No records to export!', 'error');
        return;
    }

    // Create CSV content with all fields
    const headers = [
        'Work Order No', 'Order Receive Date', 'Dealer', 'Customer Name', 'PO No',
        'Order Value', 'Quantity', 'Total Amount', 'Marketing Lead', 'Target Dispatch Date',
        'Quantity Product', 'Inverter Type', 'Blocks', 'Inverter Type Battery',
        'Model No', 'Rating', 'Address', 'State', 'City', 'Phone Code', 'PIN Code', 'GST No'
    ];
    const csvRows = [headers.join(',')];

    // Format dates for CSV (MM/DD/YYYY format for Excel compatibility)
    const formatDateForCSV = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    filteredRecords.forEach(record => {
        const row = [
            escapeCSV(record.workOrderNo),
            formatDateForCSV(record.orderReceiveDate),
            escapeCSV(record.dealer),
            escapeCSV(record.customerName),
            escapeCSV(record.poNo),
            record.orderValue,
            record.quantity,
            record.totalAmount,
            escapeCSV(record.marketingLead),
            formatDateForCSV(record.targetDispatchDate),
            escapeCSV(record.quantityProduct),
            escapeCSV(record.inverterType),
            escapeCSV(record.blocks),
            escapeCSV(record.inverterTypeBattery),
            escapeCSV(record.modelNo),
            escapeCSV(record.rating),
            escapeCSV(record.address),
            escapeCSV(record.state),
            escapeCSV(record.city),
            escapeCSV(record.phoneCode),
            escapeCSV(record.pinCode),
            escapeCSV(record.gstNo)
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename
    let filename = 'work_orders';
    switch (filterType) {
        case 'today':
            filename += '_today_' + todayStr;
            break;
        case 'week':
            filename += '_week_' + getStartOfWeek();
            break;
        case 'month':
            const month = String(now.getMonth() + 1).padStart(2, '0');
            filename += '_month_' + now.getFullYear() + '-' + month;
            break;
        case 'year':
            filename += '_year_' + now.getFullYear();
            break;
        default:
            filename += '_all';
    }
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${filteredRecords.length} work order(s) successfully!`, 'success');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
