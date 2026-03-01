// Your Supabase credentials
const SUPABASE_URL = "https://yaqtahzosvsrvbzurhgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_syHNOYJ3kCbtLTwXI_wWiA_D-NYvwXl";

console.log("🚀 ResortReviews Main Page with A-Z Directory");

let allReviews = [];
let resortsMap = new Map(); // Store resort id -> name mapping
let allResorts = []; // Store all resorts for search

// ===========================================
// INITIALIZATION
// ===========================================
window.addEventListener('load', async function() {
    try {
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        await loadResorts(supabaseClient);
        await loadApprovedReviews(supabaseClient);
        await loadTopResorts(supabaseClient);
        await loadAllResortsAZ(supabaseClient);
        setupSearch();
        
    } catch (err) {
        console.error("Error:", err);
    }
});

// ===========================================
// LOAD RESORTS AND SETUP SEARCHABLE DROPDOWN
// ===========================================
async function loadResorts(supabase) {
    try {
        const { data: resorts, error } = await supabase
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
async function loadApprovedReviews(supabase) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allReviews = reviews || [];
        displayReviews(allReviews);
        document.getElementById('review-count').textContent = `${allReviews.length} reviews`;
        
    } catch (error) {
        console.error("Error loading reviews:", error);
    }
}

// ===========================================
// DISPLAY REVIEWS
// ===========================================
function displayReviews(reviews) {
    const feed = document.getElementById('reviews-list');
    
    if (!reviews || reviews.length === 0) {
        feed.innerHTML = '<div class="review-item">No reviews yet. Be the first to share!</div>';
        return;
    }
    
    let html = '';
    
    reviews.forEach(review => {
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
                            <div class="photo-thumbnail" onclick="window.open('${url}')">
                                <img src="${url}" loading="lazy">
                            </div>
                        `;
                    });
                    photosHtml += '</div>';
                }
            } catch (e) {}
        }
        
        html += `
            <div class="review-item">
                <div class="review-header">
                    <h3>
                        <a href="resort.html?id=${review.resort_id}" class="resort-link">
                            ${resortName}
                        </a>
                    </h3>
                    <span class="review-rating">${review.rating}/10</span>
                </div>
                <p class="review-text">${review.review_text}</p>
                ${photosHtml}
                <div class="review-date">
                    <i class="far fa-calendar"></i> ${date}
                </div>
            </div>
        `;
    });
    
    feed.innerHTML = html;
}

// ===========================================
// LOAD TOP 3 RESORTS (Top Bar)
// ===========================================
async function loadTopResorts(supabase) {
    try {
        console.log("Loading top resorts...");
        
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('resort_id, rating, resort_name')
            .eq('status', 'approved');
        
        if (error) {
            console.error("Error fetching reviews:", error);
            throw error;
        }
        
        console.log("All approved reviews:", reviews);
        
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
        
        console.log("Resort stats:", resortStats);
        
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
        
        console.log("Top 3 resorts:", sorted);
        
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
async function loadAllResortsAZ(supabase) {
    try {
        const { data: resorts, error } = await supabase
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

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

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
            
            const { createClient } = supabase;
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            const resort_id = parseInt(document.getElementById('modal_resort_id').value);
            const rating = parseInt(document.getElementById('modal_rating').value);
            const review_text = document.getElementById('modal_review_text').value.trim();
            const photoFiles = document.getElementById('modal_photos').files;
            
            if (!resort_id) {
                alert('Please select a valid resort from the suggestions');
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
        resort_name: resortName,  // Must be underscore
        rating: rating,
        review_text: review_text,  // Must be underscore
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
    console.log('Saved theme:', savedTheme); // For debugging
    
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

// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
});

// Toggle dark mode
function toggleDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (toggle.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        console.log('Dark mode enabled'); // For debugging
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        console.log('Light mode enabled'); // For debugging
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

// Initialize theme when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    // Close settings with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSettingsModal();
        }
    });
});