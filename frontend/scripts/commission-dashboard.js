// Commission Dashboard functionality

// Wait for DOM and API to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is creator commission member
    const currentUser = window.API.getUser();
    if (!currentUser || !currentUser.isCreatorCommissionMember) {
        alert('Access denied! Only creator commission members can access this dashboard.');
        window.location.href = '/';
        return;
    }
    
    // Initialize dashboard
    initCommissionDashboard();
});

function initCommissionDashboard() {
    // Load pending requests
    loadPendingRequests();
    
    // Refresh pending requests every 15 seconds
    setInterval(loadPendingRequests, 15000);
}

// Load pending requests
async function loadPendingRequests() {
    try {
        const apiUrl = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/commission/pending-requests`, {
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

    list.innerHTML = lessonRequests.map(req => {
        const typeColor = '#f57c00';
        const typeIcon = 'book';

        // Check if current user has voted
        const userVote = req.votes.find(v => v.user._id === currentUser._id);
        const hasVoted = !!userVote;
        
        // Count votes
        const yesVotes = req.votes.filter(v => v.vote === 'yes').length;
        const noVotes = req.votes.filter(v => v.vote === 'no').length;
        const totalVotes = req.votes.length;
        
        // Build full path
        const lessonPath = req.data.category && req.data.category.domain && req.data.category.domain.subject
            ? `${req.data.category.domain.subject.name} → ${req.data.category.domain.name} → ${req.data.category.name}`
            : 'Unknown path';

        return `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${typeColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="background: ${typeColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-${typeIcon}"></i> LESSON
                            </span>
                            <span style="color: #666; font-size: 14px;">
                                by <strong>${req.requestedBy.username}</strong>
                            </span>
                            <span style="color: #999; font-size: 12px;">
                                ${new Date(req.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                            <i class="fas fa-folder-tree"></i> ${lessonPath}
                        </div>
                        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">
                            ${req.data.title}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                            ${req.data.description || ''}
                        </div>
                        
                        <!-- Preview Button -->
                        <button onclick="showLessonPreview('${req._id}')" style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                            <i class="fas fa-eye"></i> Preview Lesson
                        </button>
                        
                        <!-- Vote Progress -->
                        <div class="vote-progress">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 14px; font-weight: 600; color: #333;">
                                    Votes: ${totalVotes}/7
                                </span>
                                <div style="display: flex; gap: 16px; font-size: 14px;">
                                    <span style="color: #28a745; font-weight: 600;">
                                        <i class="fas fa-check"></i> ${yesVotes}
                                    </span>
                                    <span style="color: #dc3545; font-weight: 600;">
                                        <i class="fas fa-times"></i> ${noVotes}
                                    </span>
                                </div>
                            </div>
                            <div class="vote-bar">
                                ${Array(7).fill(0).map((_, i) => 
                                    `<div class="vote-bar-item ${i < totalVotes ? 'voted' : ''}"></div>`
                                ).join('')}
                            </div>
                        </div>
                        
                        ${hasVoted ? `
                            <div style="margin-top: 12px; padding: 8px 12px; background: ${userVote.vote === 'yes' ? '#d4edda' : '#f8d7da'}; color: ${userVote.vote === 'yes' ? '#155724' : '#721c24'}; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                <i class="fas fa-${userVote.vote === 'yes' ? 'check-circle' : 'times-circle'}"></i> You voted ${userVote.vote.toUpperCase()}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${!hasVoted ? `
                    <div class="vote-buttons">
                        <button class="vote-btn yes" onclick="voteOnRequest('${req._id}', 'yes')">
                            <i class="fas fa-check"></i> Vote YES
                        </button>
                        <button class="vote-btn no" onclick="voteOnRequest('${req._id}', 'no')">
                            <i class="fas fa-times"></i> Vote NO
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Store requests globally for preview
let currentRequests = [];

function displayPendingRequests(requests) {
    const list = document.getElementById('pendingRequestsList');
    const count = document.getElementById('pendingCount');
    const currentUser = window.API.getUser();
    
    // Filter only lessons
    const lessonRequests = requests.filter(req => req.type === 'lesson');
    currentRequests = lessonRequests; // Store for preview
    
    count.textContent = lessonRequests.length;

    if (lessonRequests.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No pending lesson requests</p>';
        return;
    }

    list.innerHTML = lessonRequests.map(req => {
        const typeColor = '#f57c00';
        const typeIcon = 'book';

        // Check if current user has voted
        const userVote = req.votes.find(v => v.user._id === currentUser._id);
        const hasVoted = !!userVote;
        
        // Count votes
        const yesVotes = req.votes.filter(v => v.vote === 'yes').length;
        const noVotes = req.votes.filter(v => v.vote === 'no').length;
        const totalVotes = req.votes.length;

        return `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${typeColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="background: ${typeColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                <i class="fas fa-${typeIcon}"></i> LESSON
                            </span>
                            <span style="color: #666; font-size: 14px;">
                                by <strong>${req.requestedBy.username}</strong>
                            </span>
                            <span style="color: #999; font-size: 12px;">
                                ${new Date(req.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 4px;">
                            ${req.data.title}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                            ${req.data.description || ''}
                        </div>
                        
                        <!-- Vote Progress -->
                        <div class="vote-progress">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-size: 14px; font-weight: 600; color: #333;">
                                    Votes: ${totalVotes}/7
                                </span>
                                <div style="display: flex; gap: 16px; font-size: 14px;">
                                    <span style="color: #28a745; font-weight: 600;">
                                        <i class="fas fa-check"></i> ${yesVotes}
                                    </span>
                                    <span style="color: #dc3545; font-weight: 600;">
                                        <i class="fas fa-times"></i> ${noVotes}
                                    </span>
                                </div>
                            </div>
                            <div class="vote-bar">
                                ${Array(7).fill(0).map((_, i) => 
                                    `<div class="vote-bar-item ${i < totalVotes ? 'voted' : ''}"></div>`
                                ).join('')}
                            </div>
                        </div>
                        
                        ${hasVoted ? `
                            <div style="margin-top: 12px; padding: 8px 12px; background: ${userVote.vote === 'yes' ? '#d4edda' : '#f8d7da'}; color: ${userVote.vote === 'yes' ? '#155724' : '#721c24'}; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                <i class="fas fa-${userVote.vote === 'yes' ? 'check-circle' : 'times-circle'}"></i> You voted ${userVote.vote.toUpperCase()}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${!hasVoted ? `
                    <div class="vote-buttons">
                        <button class="vote-btn yes" onclick="voteOnRequest('${req._id}', 'yes')">
                            <i class="fas fa-check"></i> Vote YES
                        </button>
                        <button class="vote-btn no" onclick="voteOnRequest('${req._id}', 'no')">
                            <i class="fas fa-times"></i> Vote NO
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function voteOnRequest(requestId, vote) {
    if (!confirm(`Are you sure you want to vote ${vote.toUpperCase()} on this request?`)) {
        return;
    }

    try {
        const apiUrl = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/commission/vote/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.API.getToken()}`
            },
            body: JSON.stringify({ vote })
        });
        const data = await response.json();

        if (data.success) {
            if (data.status) {
                // Final decision made
                alert(`Request ${data.status}! Final vote: ${data.votes.yes}-${data.votes.no}`);
            } else {
                alert(`Vote recorded! (${data.votesCount}/${data.totalNeeded} votes)`);
            }
            loadPendingRequests();
        } else {
            alert('Error voting: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error voting: ' + error.message);
    }
}

// Make function global for onclick handlers
window.voteOnRequest = voteOnRequest;
