// Your Supabase credentials
const SUPABASE_URL = "https://yaqtahzosvsrvbzurhgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_syHNOYJ3kCbtLTwXI_wWiA_D-NYvwXl";

console.log("🚀 ResortReviews Main Page");

let allReviews = [];
let resortsMap = new Map(); // Store resort id -> name mapping
let allResorts = []; // Store all resorts for search
let supabaseClient;

// Initialize Supabase client
const { createClient } = supabase;
supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===========================================
// INITIALIZATION
// ===========================================
window.addEventListener('load', async function() {
    try {
        await loadResorts();
        await loadApprovedReviews();
        await loadTopResorts();
        await loadAllResortsAZ();
        setupSearch();
        
    } catch (err) {
        console.error("Error:", err);
    }
});

// ===========================================
// LOAD RESORTS AND SETUP SEARCHABLE DROPDOWN
// ===========================================
async function loadResorts() {
    try {
        const { data: resorts, error } = await supabaseClient
            .from('resorts')
            .select('id, name')
            .order('name');
        
        if (error) throw error;
        
        // Store in map for quick lookup
        resorts.forEach(r => resortsMap.set(r.id, r.name));
        
        // Store all resorts for search
        allResorts = resorts || [];
        
        console.log(`✅ Loaded ${resorts.length} resorts`);
        
        // Setup searchable dropdown
        setupResortSearch();
        
    } catch (error) {
        console.error("Error loading resorts:", error);
    }
}

// ===========================================
// SEARCHABLE RESORT DROPDOWN - 3 LETTER MINIMUM
// ===========================================
function setupResortSearch() {
    const searchInput = document.getElementById('resort_search');
    const suggestionsBox = document.getElementById('resort_suggestions');
    const hiddenInput = document.getElementById('modal_resort_id');
    
    if (!searchInput) {
        console.log("Search input not found");
        return;
    }
    
    console.log("Setting up resort search with", allResorts.length, "resorts");
    
    // Handle input changes
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        // Only show suggestions after 3 or more characters
        if (searchTerm.length < 3) {
            suggestionsBox.classList.remove('active');
            hiddenInput.value = '';
            return;
        }
        
        // Filter resorts - match ANY part of the name
        const matches = allResorts.filter(resort => 
            resort.name.toLowerCase().includes(searchTerm)
        );
        
        // Show suggestions
        if (matches.length > 0) {
            let html = '';
            matches.slice(0, 8).forEach(resort => {
                html += `<div class="suggestion-item" data-id="${resort.id}" data-name="${resort.name.replace(/'/g, "\\'")}">${resort.name}</div>`;
            });
            suggestionsBox.innerHTML = html;
            suggestionsBox.classList.add('active');
        } else {
            suggestionsBox.innerHTML = '<div class="no-results">No resorts found</div>';
            suggestionsBox.classList.add('active');
        }
    });
    
    // Handle suggestion click
    suggestionsBox.addEventListener('click', function(e) {
        const suggestion = e.target.closest('.suggestion-item');
        if (suggestion) {
            const resortId = suggestion.dataset.id;
            const resortName = suggestion.dataset.name;
            
            searchInput.value = resortName;
            hiddenInput.value = resortId;
            suggestionsBox.classList.remove('active');
        }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.remove('active');
        }
    });
    
    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const items = suggestionsBox.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;
        
        let selectedIndex = -1;
        
        items.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                selectedIndex = index;
            }
        });
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectedIndex < items.length - 1) {
                items.forEach(item => item.classList.remove('selected'));
                items[selectedIndex + 1].classList.add('selected');
                items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (items.length > 0 && selectedIndex === -1) {
                items.forEach(item => item.classList.remove('selected'));
                items[0].classList.add('selected');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedIndex > 0) {
                items.forEach(item => item.classList.remove('selected'));
                items[selectedIndex - 1].classList.add('selected');
                items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            let selectedItem = null;
            if (selectedIndex >= 0) {
                selectedItem = items[selectedIndex];
            } else if (items.length > 0) {
                selectedItem = items[0];
            }
            
            if (selectedItem) {
                searchInput.value = selectedItem.dataset.name;
                hiddenInput.value = selectedItem.dataset.id;
                suggestionsBox.classList.remove('active');
            }
        } else if (e.key === 'Escape') {
            suggestionsBox.classList.remove('active');
        }
    });
}

// ===========================================
// LOAD APPROVED REVIEWS
// ===========================================
async function loadApprovedReviews() {
    try {
        const { data: reviews, error } = await supabaseClient
            .from('reviews')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allReviews = reviews || [];
        await displayReviews(allReviews);
        document.getElementById('review-count').textContent = `${allReviews.length} reviews`;
        
    } catch (error) {
        console.error("Error loading reviews:", error);
    }
}

// ===========================================
// DISPLAY REVIEWS WITH COMMENTS
// ===========================================
async function displayReviews(reviews) {
    const feed = document.getElementById('reviews-list');
    
    if (!reviews || reviews.length === 0) {
        feed.innerHTML = '<div class="review-item">No reviews yet. Be the first to share!</div>';
        return;
    }
    
    let html = '';
    
    for (const review of reviews) {
        const date = new Date(review.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Get resort name from map or use fallback
        const resortName = resortsMap.get(review.resort_id) || review.resort_name || 'Unknown Resort';
        
        // Handle photos
        let photosHtml = '';
        if (review.photo_urls && review.photo_urls !== '[]') {
            try {
                const photoUrls = JSON.parse(review.photo_urls);
                if (photoUrls.length > 0) {
                    photosHtml = '<div class="photo-gallery">';
                    photoUrls.forEach(url => {
                        photosHtml += `
                            <div class="photo-thumbnail" onclick="openCommentModal(${review.id})">
                                <img src="${url}" loading="lazy">
                            </div>
                        `;
                    });
                    photosHtml += '</div>';
                }
            } catch (e) {}
        }
        
        // Load comments for this review
        const { data: comments } = await supabaseClient
            .from('resort_comments')
            .select('*')
            .eq('review_id', review.id)
            .order('created_at', { ascending: false });
        
        const commentCount = comments?.length || 0;
        const latestComments = comments?.slice(0, 2) || [];
        
        // Build comments preview HTML - WITHOUT REACTIONS
        let commentsHtml = '';
        if (commentCount > 0) {
            commentsHtml = '<div class="comment-preview">';
            latestComments.forEach(comment => {
                const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
                
                commentsHtml += `
                    <div class="comment-preview-item">
                        <div class="comment-preview-avatar">
                            ${comment.is_official ? '🏨' : '👤'}
                        </div>
                        <div class="comment-preview-content">
                            <div class="comment-preview-header">
                                <span class="comment-preview-author">
                                    ${comment.is_official ? 'Official Response' : 'Guest'}
                                </span>
                                ${comment.is_official ? '<span class="official-badge-small">✓</span>' : ''}
                                <span class="comment-preview-date">${commentDate}</span>
                            </div>
                            <p class="comment-preview-text">${comment.comment_text}</p>
                        </div>
                    </div>
                `;
            });
            
            if (commentCount > 2) {
                commentsHtml += `
                    <div class="view-all-comments" onclick="openCommentModal(${review.id})">
                        View all ${commentCount} comments
                    </div>
                `;
            }
            commentsHtml += '</div>';
        }
        
// Main review HTML with comment button
html += `
    <div class="review-item">
        <div class="review-header">
            <h3>
                <a href="resort.html?id=${review.resort_id}" class="resort-link">
                    ${resortName}
                </a>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="review-rating">${review.rating}/10</span>
                
                <!-- Three dots menu -->
                <div class="post-menu-container">
                    <button class="post-menu-btn" onclick="togglePostMenu(${review.id})">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                    <div class="post-menu-dropdown" id="post-menu-${review.id}">
                        <div class="post-menu-item" onclick="reportReview(${review.id})">
                            <i class="fas fa-flag"></i> Report post
                        </div>
                        <!-- Add more menu items here if needed -->
                    </div>
                </div>
            </div>
        </div>
        <p class="review-text">${review.review_text}</p>
        ${photosHtml}
        
        <div class="review-actions">
            <button class="action-btn" onclick="openCommentModal(${review.id})">
                <i class="far fa-comment"></i> Comment (${commentCount})
            </button>
            <button class="action-btn" onclick="shareReview(${review.id})">
                <i class="far fa-share-square"></i> Share
            </button>
        </div>
        
        ${commentsHtml}
        
        <div class="review-date">
            <i class="far fa-calendar"></i> ${date}
        </div>
    </div>
`;
    }
    
    feed.innerHTML = html;
}

// ===========================================
// LOAD TOP 3 RESORTS (Top Bar)
// ===========================================
async function loadTopResorts() {
    try {
        console.log("Loading top resorts...");
        
        const { data: reviews, error } = await supabaseClient
            .from('reviews')
            .select('resort_id, rating, resort_name')
            .eq('status', 'approved');
        
        if (error) {
            console.error("Error fetching reviews:", error);
            throw error;
        }
        
        // If no reviews yet, show message
        if (!reviews || reviews.length === 0) {
            document.getElementById('topResorts').innerHTML = '<div class="ranking-item">No reviews yet</div>';
            return;
        }
        
        // Calculate averages per resort
        const resortStats = {};
        reviews.forEach(r => {
            // Skip reviews without resort_id
            if (!r.resort_id) {
                console.log("Review missing resort_id:", r);
                return;
            }
            
            if (!resortStats[r.resort_id]) {
                resortStats[r.resort_id] = { 
                    total: 0, 
                    count: 0,
                    name: r.resort_name || 'Unknown'
                };
            }
            resortStats[r.resort_id].total += r.rating;
            resortStats[r.resort_id].count++;
        });
        
        // Convert to array and sort
        const sorted = Object.entries(resortStats)
            .map(([id, data]) => ({
                id: parseInt(id),
                name: data.name,
                avg: (data.total / data.count).toFixed(1),
                count: data.count
            }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3);
        
        const rankingsDiv = document.getElementById('topResorts');
        if (!rankingsDiv) return;
        
        if (sorted.length === 0) {
            rankingsDiv.innerHTML = '<div class="ranking-item">No resorts with reviews</div>';
            return;
        }
        
        let html = '';
        sorted.forEach((resort, index) => {
            // Get first word of resort name for display
            const displayName = resort.name.split(' ')[0];
            html += `
                <div class="ranking-item" onclick="window.location.href='resort.html?id=${resort.id}'">
                    <div class="rank">#${index + 1}</div>
                    <div class="name">${displayName}</div>
                    <div class="rating">&#11088; ${resort.avg}</div>
                </div>
            `;
        });
        
        rankingsDiv.innerHTML = html;
        
    } catch (error) {
        console.error("Error in loadTopResorts:", error);
        document.getElementById('topResorts').innerHTML = '<div class="ranking-item">No reviews yet</div>';
    }
}

// ===========================================
// LOAD ALL RESORTS A-Z (Right Sidebar)
// ===========================================
async function loadAllResortsAZ() {
    try {
        const { data: resorts, error } = await supabaseClient
            .from('resorts')
            .select('id, name')
            .order('name');
        
        if (error) throw error;
        
        const resortList = document.getElementById('resortRankings');
        if (!resortList) return;
        
        // Group resorts by first letter
        const grouped = {};
        resorts.forEach(resort => {
            const firstLetter = resort.name.charAt(0).toUpperCase();
            if (!grouped[firstLetter]) {
                grouped[firstLetter] = [];
            }
            grouped[firstLetter].push(resort);
        });
        
        // Create A-Z navigation
        let html = `
            <div class="az-nav">
                ${Object.keys(grouped).sort().map(letter => 
                    `<span class="az-letter" onclick="scrollToLetter('${letter}')">${letter}</span>`
                ).join('')}
            </div>
            <div class="az-resort-list">
        `;
        
        // List all resorts by letter
        Object.keys(grouped).sort().forEach(letter => {
            html += `<div class="az-section" id="letter-${letter}">`;
            html += `<h4 class="az-section-title">${letter}</h4>`;
            
            grouped[letter].forEach(resort => {
                html += `
                    <div class="az-resort-item" onclick="window.location.href='resort.html?id=${resort.id}'">
                        <span class="resort-name">${resort.name}</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        html += `</div>`;
        
        resortList.innerHTML = html;
        
        // Also update the header
        const sidebarHeader = document.querySelector('.sidebar-header h3');
        if (sidebarHeader) {
            sidebarHeader.innerHTML = '<i class="fas fa-list"></i> All Resorts A-Z';
        }
        
    } catch (error) {
        console.error("Error loading resorts A-Z:", error);
        document.getElementById('resortRankings').innerHTML = '<div class="loading-spinner">Error loading resorts</div>';
    }
}

// Add scroll function
window.scrollToLetter = function(letter) {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// ===========================================
// SEARCH FUNCTIONALITY (Main Search Bar)
// ===========================================
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase().trim();
            if (term === '') {
                displayReviews(allReviews);
            } else {
                const filtered = allReviews.filter(review => {
                    const resortName = resortsMap.get(review.resort_id) || '';
                    return resortName.toLowerCase().includes(term);
                });
                displayReviews(filtered);
            }
        });
    }
}

// ===========================================
// MODAL FUNCTIONS
// ===========================================
function openModal() {
    document.getElementById('shareModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Clear form when opening
    document.getElementById('resort_search').value = '';
    document.getElementById('modal_resort_id').value = '';
    document.getElementById('modal_review_text').value = '';
    document.getElementById('modalPhotoPreview').innerHTML = '';
    document.getElementById('modalRatingValue').textContent = '5';
    document.getElementById('modal_rating').value = '5';
}

function closeModal() {
    document.getElementById('shareModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ===========================================
// COMMENT FUNCTIONS
// ===========================================
let currentReviewId = null;

window.openCommentModal = async function(reviewId) {
    currentReviewId = reviewId;
    
    // Fetch review details
    const { data: review } = await supabaseClient
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .single();
    
    // Fetch comments for this review
    const { data: comments } = await supabaseClient
        .from('resort_comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false });
    
    const date = new Date(review.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Handle photos
    let photosHtml = '';
    if (review.photo_urls && review.photo_urls !== '[]') {
        try {
            const photoUrls = JSON.parse(review.photo_urls);
            if (photoUrls.length > 0) {
                photosHtml = '<div class="modal-post-photos">';
                photoUrls.forEach(url => {
                    photosHtml += `
                        <div class="modal-post-photo" onclick="window.open('${url}')">
                            <img src="${url}" loading="lazy">
                        </div>
                    `;
                });
                photosHtml += '</div>';
            }
        } catch (e) {}
    }
    
    // Build comments HTML - WITHOUT REACTIONS
    let commentsHtml = '';
    if (comments && comments.length > 0) {
        comments.forEach(comment => {
            const commentDate = new Date(comment.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            // Get resort name for official comments
            const commentAuthor = comment.is_official ? (resortsMap.get(review.resort_id) || 'Resort') : 'Guest';
            
            commentsHtml += `
                <div class="modal-comment-item">
                    <div class="modal-comment-avatar">
                        ${comment.is_official ? '🏨' : '👤'}
                    </div>
                    <div class="modal-comment-content">
                        <div class="modal-comment-header">
                            <span class="modal-comment-author">
                                ${commentAuthor}
                            </span>
                            ${comment.is_official ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
                            <span class="comment-date-small">${commentDate}</span>
                        </div>
                        <p class="modal-comment-text">${comment.comment_text}</p>
                    </div>
                </div>
            `;
        });
    } else {
        commentsHtml = '<div class="no-comments-modal">No comments yet.</div>';
    }
    
    const modalContent = `
        <div class="modal-post">
            <div class="modal-post-header">
                <span class="modal-post-rating">${review.rating}/10</span>
                <span class="modal-post-date">${date}</span>
            </div>
            <p class="modal-post-text">${review.review_text}</p>
            ${photosHtml}
        </div>
        <div class="modal-comments">
            <div class="comments-list">
                ${commentsHtml}
            </div>
        </div>
    `;
    
    document.getElementById('commentModalContent').innerHTML = modalContent;
    document.getElementById('commentModal').classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.closeCommentModal = function() {
    document.getElementById('commentModal').classList.remove('active');
    document.body.style.overflow = '';
    currentReviewId = null;
};

window.shareReview = function(reviewId) {
    const url = `https://resortreviews.vercel.app/resort.html?id=${reviewId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
};

// ===========================================
// MODAL FORM SETUP
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    // Modal rating slider
    const modalRating = document.getElementById('modal_rating');
    const modalRatingValue = document.getElementById('modalRatingValue');
    
    if (modalRating) {
        modalRating.addEventListener('input', function() {
            modalRatingValue.textContent = this.value;
        });
    }

    // Modal photo preview
    const modalPhotos = document.getElementById('modal_photos');
    if (modalPhotos) {
        modalPhotos.addEventListener('change', function(e) {
            const preview = document.getElementById('modalPhotoPreview');
            preview.innerHTML = '';
            
            for (let i = 0; i < Math.min(e.target.files.length, 3); i++) {
                const file = e.target.files[i];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Modal form submission
    const modalForm = document.getElementById('modalReviewForm');
    if (modalForm) {
        modalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const resort_id = parseInt(document.getElementById('modal_resort_id').value);
            const rating = parseInt(document.getElementById('modal_rating').value);
            const review_text = document.getElementById('modal_review_text').value.trim();
            const photoFiles = document.getElementById('modal_photos').files;
            const category_id = parseInt(document.getElementById('review_category').value);
            
            if (!resort_id) {
                alert('Please select a valid resort from the suggestions');
                return;
            }
            
            if (!category_id) {
                alert('Please select a category');
                return;
            }
            
            const messageDiv = document.getElementById('modalMessage');
            messageDiv.style.display = 'block';
            messageDiv.textContent = "Submitting...";
            messageDiv.className = "message";
            
            try {
                let photoUrls = [];
                
                if (photoFiles.length > 0) {
                    const maxPhotos = Math.min(photoFiles.length, 3);
                    for (let i = 0; i < maxPhotos; i++) {
                        const file = photoFiles[i];
                        const fileName = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        
                        const { error } = await supabaseClient.storage
                            .from('resort-photos')
                            .upload(`public/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/resort-photos/public/${fileName}`;
                        photoUrls.push(publicUrl);
                    }
                }
                
                // Get resort name from map
                const resortName = resortsMap.get(resort_id) || '';
                
                const { error } = await supabaseClient
                    .from('reviews')
                    .insert([{ 
                        resort_id: resort_id,
                        resort_name: resortName,
                        category_id: category_id,
                        rating: rating,
                        review_text: review_text,
                        photo_urls: JSON.stringify(photoUrls),
                        status: 'pending'
                    }]);
                
                if (error) throw error;
                
                messageDiv.textContent = "✅ Review submitted for moderation!";
                messageDiv.className = "message success";
                
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                    closeModal();
                }, 2000);
                
            } catch (error) {
                console.error("Submission error:", error);
                messageDiv.textContent = "Error: " + error.message;
                messageDiv.className = "message error";
            }
        });
    }
});

// ===========================================
// DARK MODE FUNCTIONS
// ===========================================

// Check for saved theme preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    console.log('Saved theme:', savedTheme);
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = false;
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        console.log('Dark mode enabled');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        console.log('Light mode enabled');
    }
}

// Settings modal functions
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update toggle state based on current theme
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        toggle.checked = currentTheme === 'dark';
    }
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize theme
initTheme();

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSettingsModal();
        closeModal();
        closeCommentModal();
    }
});
// ===========================================
// RESORT COMPARISON TOOL
// ===========================================

let allResortsList = [];
let selectedResort1 = null;
let selectedResort2 = null;

// Load all resorts for comparison
async function loadResortsForComparison() {
    try {
        const { data: resorts } = await supabaseClient
            .from('resorts')
            .select('id, name')
            .order('name');
        
        allResortsList = resorts || [];
        console.log(`✅ Loaded ${allResortsList.length} resorts for comparison`);
    } catch (error) {
        console.error('Error loading resorts:', error);
    }
}

// Setup search for resort selector
function setupComparisonSearch(inputId, suggestionsId, resortNum) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);

    if (!input) return;

    input.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            suggestions.classList.remove('active');
            return;
        }

        const matches = allResortsList.filter(resort => 
            resort.name.toLowerCase().includes(searchTerm)
        );

        if (matches.length > 0) {
            let html = '';
            matches.slice(0, 8).forEach(resort => {
                html += `<div class="suggestion-item" onclick="selectResort(${resortNum}, ${resort.id}, '${resort.name.replace(/'/g, "\\'")}')">${resort.name}</div>`;
            });
            suggestions.innerHTML = html;
            suggestions.classList.add('active');
        } else {
            suggestions.innerHTML = '<div class="suggestion-item">No resorts found</div>';
            suggestions.classList.add('active');
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });

    // Handle keyboard navigation
    input.addEventListener('keydown', function(e) {
        const items = suggestions.querySelectorAll('.suggestion-item');
        if (items.length === 0) return;

        let selectedIndex = -1;
        items.forEach((item, index) => {
            if (item.classList.contains('selected')) {
                selectedIndex = index;
            }
        });

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectedIndex < items.length - 1) {
                items.forEach(item => item.classList.remove('selected'));
                items[selectedIndex + 1].classList.add('selected');
                items[selectedIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (items.length > 0 && selectedIndex === -1) {
                items.forEach(item => item.classList.remove('selected'));
                items[0].classList.add('selected');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedIndex > 0) {
                items.forEach(item => item.classList.remove('selected'));
                items[selectedIndex - 1].classList.add('selected');
                items[selectedIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            let selectedItem = null;
            if (selectedIndex >= 0) {
                selectedItem = items[selectedIndex];
            } else if (items.length > 0) {
                selectedItem = items[0];
            }
            
            if (selectedItem) {
                selectedItem.click();
            }
        } else if (e.key === 'Escape') {
            suggestions.classList.remove('active');
        }
    });
}

// Select a resort
window.selectResort = function(resortNum, resortId, resortName) {
    if (resortNum === 1) {
        selectedResort1 = { id: resortId, name: resortName };
        document.getElementById('selectedResort1').style.display = 'flex';
        document.getElementById('resortName1').textContent = resortName;
        document.getElementById('compareSearch1').value = '';
        document.getElementById('compareSuggestions1').classList.remove('active');
    } else {
        selectedResort2 = { id: resortId, name: resortName };
        document.getElementById('selectedResort2').style.display = 'flex';
        document.getElementById('resortName2').textContent = resortName;
        document.getElementById('compareSearch2').value = '';
        document.getElementById('compareSuggestions2').classList.remove('active');
    }

    // Enable compare button if both resorts selected
    document.getElementById('compareBtn').disabled = !(selectedResort1 && selectedResort2);
    
    // Hide previous results when changing selection
    document.getElementById('comparisonResults').style.display = 'none';
};

// Clear selected resort
window.clearResort = function(resortNum) {
    if (resortNum === 1) {
        selectedResort1 = null;
        document.getElementById('selectedResort1').style.display = 'none';
        document.getElementById('resortName1').textContent = '';
    } else {
        selectedResort2 = null;
        document.getElementById('selectedResort2').style.display = 'none';
        document.getElementById('resortName2').textContent = '';
    }
    document.getElementById('compareBtn').disabled = true;
    document.getElementById('comparisonResults').style.display = 'none';
};

// Compare resorts
window.compareResorts = async function() {
    if (!selectedResort1 || !selectedResort2) return;

    // Show loading state
    document.getElementById('comparisonResults').style.display = 'block';
    document.getElementById('categoryBreakdown').innerHTML = '<div style="text-align: center; padding: 20px;">Loading comparison...</div>';

    try {
        // Fetch data for both resorts
        const [reviews1, reviews2] = await Promise.all([
            supabaseClient
                .from('reviews')
                .select('rating, photo_urls')
                .eq('resort_id', selectedResort1.id)
                .eq('status', 'approved'),
            supabaseClient
                .from('reviews')
                .select('rating, photo_urls')
                .eq('resort_id', selectedResort2.id)
                .eq('status', 'approved')
        ]);

        // Calculate averages
        const avgRating1 = reviews1.data?.length ? 
            (reviews1.data.reduce((sum, r) => sum + r.rating, 0) / reviews1.data.length).toFixed(1) : '0.0';
        const avgRating2 = reviews2.data?.length ? 
            (reviews2.data.reduce((sum, r) => sum + r.rating, 0) / reviews2.data.length).toFixed(1) : '0.0';

        // Count photos
        let photoCount1 = 0;
        let photoCount2 = 0;
        
        if (reviews1.data) {
            reviews1.data.forEach(r => {
                if (r.photo_urls && r.photo_urls !== '[]') {
                    try {
                        photoCount1 += JSON.parse(r.photo_urls).length;
                    } catch (e) {}
                }
            });
        }
        
        if (reviews2.data) {
            reviews2.data.forEach(r => {
                if (r.photo_urls && r.photo_urls !== '[]') {
                    try {
                        photoCount2 += JSON.parse(r.photo_urls).length;
                    } catch (e) {}
                }
            });
        }

        // Determine winner for each category
        let wins1 = 0, wins2 = 0;
        
        // Rating winner
        if (parseFloat(avgRating1) > parseFloat(avgRating2)) wins1++;
        else if (parseFloat(avgRating2) > parseFloat(avgRating1)) wins2++;
        
        // Reviews count winner
        if ((reviews1.data?.length || 0) > (reviews2.data?.length || 0)) wins1++;
        else if ((reviews2.data?.length || 0) > (reviews1.data?.length || 0)) wins2++;
        
        // Photos count winner
        if (photoCount1 > photoCount2) wins1++;
        else if (photoCount2 > photoCount1) wins2++;

        // Update UI
        document.getElementById('badge1').innerHTML = `<i class="fas fa-hotel"></i> ${selectedResort1.name}`;
        document.getElementById('badge2').innerHTML = `<i class="fas fa-hotel"></i> ${selectedResort2.name}`;
        
        document.getElementById('rating1').textContent = `⭐ ${avgRating1}`;
        document.getElementById('rating2').textContent = `⭐ ${avgRating2}`;
        
        document.getElementById('reviews1').textContent = reviews1.data?.length || 0;
        document.getElementById('reviews2').textContent = reviews2.data?.length || 0;
        
        document.getElementById('photos1').textContent = photoCount1;
        document.getElementById('photos2').textContent = photoCount2;
        
        document.getElementById('wins1').textContent = wins1;
        document.getElementById('wins2').textContent = wins2;

        // Category breakdown
        const categoryBreakdown = document.getElementById('categoryBreakdown');
        categoryBreakdown.innerHTML = `
            <div class="category-row">
                <span class="category-name">⭐ Average Rating</span>
                <div class="category-values">
                    <span style="color: ${parseFloat(avgRating1) > parseFloat(avgRating2) ? '#10b981' : 'inherit'}">${avgRating1}</span>
                    <span style="color: var(--text-light);">vs</span>
                    <span style="color: ${parseFloat(avgRating2) > parseFloat(avgRating1) ? '#10b981' : 'inherit'}">${avgRating2}</span>
                </div>
            </div>
            <div class="category-row">
                <span class="category-name">📝 Total Reviews</span>
                <div class="category-values">
                    <span style="color: ${(reviews1.data?.length || 0) > (reviews2.data?.length || 0) ? '#10b981' : 'inherit'}">${reviews1.data?.length || 0}</span>
                    <span style="color: var(--text-light);">vs</span>
                    <span style="color: ${(reviews2.data?.length || 0) > (reviews1.data?.length || 0) ? '#10b981' : 'inherit'}">${reviews2.data?.length || 0}</span>
                </div>
            </div>
            <div class="category-row">
                <span class="category-name">📸 Total Photos</span>
                <div class="category-values">
                    <span style="color: ${photoCount1 > photoCount2 ? '#10b981' : 'inherit'}">${photoCount1}</span>
                    <span style="color: var(--text-light);">vs</span>
                    <span style="color: ${photoCount2 > photoCount1 ? '#10b981' : 'inherit'}">${photoCount2}</span>
                </div>
            </div>
        `;

        // Winner message
        const winnerMsg = document.getElementById('winnerMessage');
        if (wins1 > wins2) {
            winnerMsg.className = 'winner-message winner-a';
            winnerMsg.innerHTML = `<i class="fas fa-trophy"></i> ${selectedResort1.name} wins!`;
        } else if (wins2 > wins1) {
            winnerMsg.className = 'winner-message winner-b';
            winnerMsg.innerHTML = `<i class="fas fa-trophy"></i> ${selectedResort2.name} wins!`;
        } else {
            winnerMsg.className = 'winner-message tie';
            winnerMsg.innerHTML = `<i class="fas fa-handshake"></i> It's a tie!`;
        }

    } catch (error) {
        console.error('Error comparing resorts:', error);
        document.getElementById('categoryBreakdown').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error loading comparison data</div>';
    }
};

// Close comparison
window.closeComparison = function() {
    document.getElementById('comparisonResults').style.display = 'none';
};

// Initialize comparison tool
document.addEventListener('DOMContentLoaded', function() {
    loadResortsForComparison();
    setupComparisonSearch('compareSearch1', 'compareSuggestions1', 1);
    setupComparisonSearch('compareSearch2', 'compareSuggestions2', 2);
});
// Toggle post menu dropdown
window.togglePostMenu = function(reviewId) {
    // Close all other open menus first
    document.querySelectorAll('.post-menu-dropdown.active').forEach(menu => {
        if (menu.id !== `post-menu-${reviewId}`) {
            menu.classList.remove('active');
        }
    });
    
    // Toggle this menu
    const menu = document.getElementById(`post-menu-${reviewId}`);
    if (menu) {
        menu.classList.toggle('active');
    }
};

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu-container')) {
        document.querySelectorAll('.post-menu-dropdown.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});
// Report a review
window.reportReview = async function(reviewId) {
    // Close the menu first
    document.getElementById(`post-menu-${reviewId}`)?.classList.remove('active');
    
    const reason = prompt('Why are you reporting this review? (Optional)');
    
    if (reason === null) return; // User cancelled
    
    try {
        // First get the review details to know which resort it belongs to
        const { data: review, error: reviewError } = await supabaseClient
            .from('reviews')
            .select('resort_id')
            .eq('id', reviewId)
            .single();
        
        if (reviewError) throw reviewError;
        
        // Insert the report
        const { error } = await supabaseClient
            .from('reports')
            .insert([{
                review_id: reviewId,
                resort_id: review.resort_id,
                reason: reason || 'No reason provided',
                description: reason || 'No reason provided',
                status: 'pending',
                created_at: new Date()
            }]);
        
        if (error) throw error;
        
        alert('✅ Review reported. Our moderation team will review it.');
        
    } catch (error) {
        console.error('Error reporting review:', error);
        alert('Error submitting report. Please try again.');
    }
};
// ===========================================
// JOB BOARD FUNCTIONS
// ===========================================

let currentJobs = [];
let currentFeedTab = 'reviews';

// Switch between Reviews and Jobs tabs
window.switchFeedTab = function(tab) {
    currentFeedTab = tab;
    
    // Update tab styles
    document.getElementById('tab-reviews').classList.toggle('active', tab === 'reviews');
    document.getElementById('tab-jobs').classList.toggle('active', tab === 'jobs');
    
    // Show/hide feeds
    document.getElementById('reviews-feed').style.display = tab === 'reviews' ? 'block' : 'none';
    document.getElementById('jobs-feed').style.display = tab === 'jobs' ? 'block' : 'none';
    
    if (tab === 'jobs') {
        loadAllJobs();
    }
};

// Load all active jobs for guest feed
async function loadAllJobs() {
    try {
        const { data: jobs } = await supabaseClient
            .from('resort_jobs')
            .select(`
                *,
                resorts (
                    name,
                    id
                )
            `)
            .eq('is_active', true)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
        
        displayJobs(jobs || [], 'jobs-feed');
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Display jobs in feed
function displayJobs(jobs, containerId) {
    const container = document.getElementById(containerId);
    
    if (jobs.length === 0) {
        container.innerHTML = '<div class="no-jobs">No job openings at the moment</div>';
        return;
    }
    
    let html = '';
    jobs.forEach(job => {
        const date = new Date(job.created_at).toLocaleDateString();
        const expires = new Date(job.expires_at).toLocaleDateString();
        
        // Salary display
        let salaryText = 'Not specified';
        if (job.salary_min && job.salary_max) {
            salaryText = `Rf ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}/${job.salary_period || 'month'}`;
        } else if (job.salary_min) {
            salaryText = `From Rf ${job.salary_min.toLocaleString()}/${job.salary_period || 'month'}`;
        }
        
        html += `
            <div class="job-card">
                <div class="job-header">
                    <h3><a href="resort.html?id=${job.resort_id}" class="resort-link">${job.resorts?.name}</a></h3>
                    <span class="job-department">${job.department}</span>
                </div>
                
                <h4 class="job-title">${job.title}</h4>
                
                <div class="job-meta">
                    <span><i class="fas fa-clock"></i> ${job.job_type}</span>
                    <span><i class="fas fa-tag"></i> ${salaryText}</span>
                </div>
                
                <p class="job-description">${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}</p>
                
                ${job.requirements ? `
                    <div class="job-requirements">
                        <strong>Requirements:</strong> ${job.requirements.substring(0, 100)}${job.requirements.length > 100 ? '...' : ''}
                    </div>
                ` : ''}
                
                <div class="job-footer">
                    <span class="job-date">Posted: ${date}</span>
                    <button class="action-btn" onclick="viewJobDetails(${job.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// View job details modal
window.viewJobDetails = async function(jobId) {
    const { data: job } = await supabaseClient
        .from('resort_jobs')
        .select(`
            *,
            resorts (
                name,
                id,
                phone,
                email
            )
        `)
        .eq('id', jobId)
        .single();
    
    if (!job) return;
    
    // Build modal HTML
    const modalHtml = `
        <div class="modal-overlay active" id="jobDetailModal" onclick="closeJobDetailModal()">
            <div class="modal-content" style="max-width: 600px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3><i class="fas fa-briefcase"></i> ${job.title}</h3>
                    <i class="fas fa-times modal-close" onclick="closeJobDetailModal()"></i>
                </div>
                
                <div class="job-detail-content" style="padding: 20px;">
                    <div class="job-detail-resort">
                        <a href="resort.html?id=${job.resort_id}" class="resort-link">${job.resorts.name}</a>
                        <span class="job-department">${job.department}</span>
                    </div>
                    
                    <div class="job-detail-meta">
                        <span><i class="fas fa-clock"></i> ${job.job_type}</span>
                        <span><i class="fas fa-calendar"></i> Expires: ${new Date(job.expires_at).toLocaleDateString()}</span>
                    </div>
                    
                    ${job.salary_min ? `
                        <div class="job-detail-salary">
                            <i class="fas fa-money-bill-wave"></i>
                            Salary: Rf ${job.salary_min.toLocaleString()}${job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : ''}/${job.salary_period || 'month'}
                        </div>
                    ` : ''}
                    
                    <div class="job-detail-section">
                        <h4>Description</h4>
                        <p>${job.description}</p>
                    </div>
                    
                    ${job.requirements ? `
                        <div class="job-detail-section">
                            <h4>Requirements</h4>
                            <p>${job.requirements}</p>
                        </div>
                    ` : ''}
                    
                    <div class="job-detail-apply">
                        <h4>How to Apply</h4>
                        ${job.application_email ? `
                            <p><i class="fas fa-envelope"></i> Send CV to: <a href="mailto:${job.application_email}">${job.application_email}</a></p>
                        ` : ''}
                        ${job.contact_person ? `
                            <p><i class="fas fa-user"></i> Contact: ${job.contact_person}</p>
                        ` : ''}
                        ${job.contact_phone ? `
                            <p><i class="fas fa-phone"></i> Call: <a href="tel:${job.contact_phone}">${job.contact_phone}</a></p>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('jobDetailModal');
    if (existing) existing.remove();
    
    // Add to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeJobDetailModal = function() {
    const modal = document.getElementById('jobDetailModal');
    if (modal) modal.remove();
};

// Resort dashboard job functions
async function loadResortJobs(resortId) {
    try {
        const { data: jobs } = await supabaseClient
            .from('resort_jobs')
            .select('*')
            .eq('resort_id', resortId)
            .order('created_at', { ascending: false });
        
        displayResortJobs(jobs || []);
    } catch (error) {
        console.error('Error loading resort jobs:', error);
    }
}

function displayResortJobs(jobs) {
    const container = document.getElementById('jobsList');
    
    if (jobs.length === 0) {
        container.innerHTML = '<p class="no-jobs">No jobs posted yet. Click "Post New Job" to get started.</p>';
        return;
    }
    
    let html = '<div class="jobs-grid">';
    jobs.forEach(job => {
        const expires = new Date(job.expires_at).toLocaleDateString();
        const status = job.is_active ? 'Active' : 'Expired';
        const statusClass = job.is_active ? 'active' : 'expired';
        
        html += `
            <div class="job-card dashboard">
                <div class="job-status ${statusClass}">${status}</div>
                <h4>${job.title}</h4>
                <p class="job-department">${job.department} • ${job.job_type}</p>
                <p class="job-expires">Expires: ${expires}</p>
                <div class="job-actions">
                    <button class="action-btn small" onclick="editJob(${job.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn small" onclick="toggleJobStatus(${job.id}, ${!job.is_active})">
                        <i class="fas fa-${job.is_active ? 'pause' : 'play'}"></i> 
                        ${job.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="action-btn small" onclick="deleteJob(${job.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}