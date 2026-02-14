// Staff Dashboard functionality

// Wait for DOM and API to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is staff
    const currentUser = window.API.getUser();
    if (!currentUser || currentUser.userType !== 'staff') {
        alert('Access denied! Only staff members can access this dashboard.');
        window.location.href = '/';
        return;
    }
    
    // Initialize dashboard
    initStaffDashboard();
});

function initStaffDashboard() {
    // Load pending requests
    loadPendingRequests();
    
    // Refresh pending requests every 15 seconds
    setInterval(loadPendingRequests, 15000);
}

// Load pending requests
async function loadPendingRequests() {
    try {
        const apiUrl = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/pending-requests?status=pending`, {
            headers: {
                'Authorization': `Bearer ${window.API.getToken()}`
            }
        });
        const data = await response.json();

        if (data.success) {
            displayPendingRequests(data.data);
        }
    } catch (error) {
        console.error('Error loading pending requests:', error);
        document.getElementById('pendingRequestsList').innerHTML = 
            '<p style="text-align: center; color: #dc3545;">Error loading requests</p>';
    }
}

function displayPendingRequests(requests) {
    const list = document.getElementById('pendingRequestsList');
    const count = document.getElementById('pendingCount');
    
    count.textContent = requests.length;

    if (requests.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No pending requests</p>';
        return;
    }

    list.innerHTML = requests.map(req => {
        const typeColors = {
            domain: '#7b1fa2',
            category: '#388e3c',
            lesson: '#f57c00'
        };
        const typeIcons = {
            domain: 'layer-group',
            category: 'folder',
            lesson: 'book'
        };

        return `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${typeColors[req.type]};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="background: ${typeColors[req.type]}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-${typeIcons[req.type]}"></i> ${req.type.toUpperCase()}
                            </span>
                            <span style="color: #666; font-size: 14px;">
                                by <strong>${req.requestedBy.username}</strong>
                            </span>
                            <span style="color: #999; font-size: 12px;">
                                ${new Date(req.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">
                            ${req.data.name || req.data.title}
                        </div>
                        <div style="font-size: 14px; color: #666;">
                            ${req.data.description || ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="approveRequest('${req._id}')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectRequest('${req._id}')" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function approveRequest(id) {
    if (!confirm('Are you sure you want to approve this request?')) return;

    try {
        const apiUrl = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/pending-requests/${id}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.API.getToken()}`
            }
        });
        const data = await response.json();

        if (data.success) {
            alert('Request approved successfully!');
            loadPendingRequests();
        } else {
            alert('Error approving request: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error approving request: ' + error.message);
    }
}

async function rejectRequest(id) {
    const note = prompt('Reason for rejection (optional):');
    if (note === null) return; // User cancelled

    try {
        const apiUrl = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/pending-requests/${id}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.API.getToken()}`
            },
            body: JSON.stringify({ note })
        });
        const data = await response.json();

        if (data.success) {
            alert('Request rejected');
            loadPendingRequests();
        } else {
            alert('Error rejecting request: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error rejecting request: ' + error.message);
    }
}

// Make functions global for onclick handlers
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
