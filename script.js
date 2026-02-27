// Your Supabase credentials
const SUPABASE_URL = "https://yaqtahzosvsrvbzurhgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_syHNOYJ3kCbtLTwXI_wWiA_D-NYvwXl";

console.log("🚀 Starting with moderation...");

// Store all reviews globally for search
let allReviews = [];

window.addEventListener('load', async function() {
    try {
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Load ONLY approved reviews
        await loadApprovedReviews(supabaseClient);
        await calculateAndDisplayAverages(supabaseClient);
        
        // Setup search
        setupSearch();
        
    } catch (err) {
        console.error("Error:", err);
    }
});

// ===========================================
// LOAD ONLY APPROVED REVIEWS
// ===========================================
async function loadApprovedReviews(supabase) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('status', 'approved')  // Only get approved reviews
            .order('created_at', { ascending: false });
        
        allReviews = reviews || [];
        displayReviews(allReviews);
        
        console.log(`Loaded ${allReviews.length} approved reviews`);
        
    } catch (error) {
        console.error("Error loading reviews:", error);
    }
}

// ===========================================
// DISPLAY REVIEWS (with optional filter)
// ===========================================
function displayReviews(reviewsToShow) {
    const reviewsList = document.getElementById('reviews-list');
    
    if (reviewsToShow && reviewsToShow.length > 0) {
        let html = '';
        
        for (const review of reviewsToShow) {
            const date = new Date(review.created_at).toLocaleString();
            
            // Handle photos
            let photosHtml = '';
            if (review.photo_urls && review.photo_urls !== '[]' && review.photo_urls !== 'null') {
                try {
                    let photoUrls = [];
                    if (typeof review.photo_urls === 'string') {
                        photoUrls = JSON.parse(review.photo_urls);
                    } else {
                        photoUrls = review.photo_urls;
                    }
                    
                    if (photoUrls.length > 0) {
                        photosHtml = '<div class="photo-gallery">';
                        
                        photoUrls.forEach((url, index) => {
                            photosHtml += `
                                <div class="photo-thumbnail">
                                    <img src="${url}" 
                                         onclick="window.open('${url}')"
                                         alt="Review photo">
                                </div>
                            `;
                        });
                        photosHtml += '</div>';
                    }
                } catch (e) {
                    console.error("Error parsing photos:", e);
                }
            }
            
            // Highlight if this is a search result
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            let highlightClass = '';
            if (searchTerm && review.resort_name.toLowerCase().includes(searchTerm)) {
                highlightClass = 'search-match';
            }
            
            html += `
                <div class="review-item ${highlightClass}">
                    <div class="review-header">
                        <h3>${review.resort_name}</h3>
                        <span class="review-rating">⭐ ${review.rating}/10</span>
                    </div>
                    <p class="review-text">"${review.review_text}"</p>
                    ${photosHtml}
                    <small class="review-date">${date}</small>
                </div>
            `;
        }
        reviewsList.innerHTML = html;
    } else {
        reviewsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">📭 No approved reviews yet. Check back soon!</p>';
    }
}

// ===========================================
// SETUP SEARCH FUNCTIONALITY
// ===========================================
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                displayReviews(allReviews);
            } else {
                const filtered = allReviews.filter(review => 
                    review.resort_name.toLowerCase().includes(searchTerm)
                );
                displayReviews(filtered);
            }
        });
    }
}

// ===========================================
// CALCULATE AND DISPLAY AVERAGES (ONLY APPROVED)
// ===========================================
async function calculateAndDisplayAverages(supabase) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('resort_name, rating')
            .eq('status', 'approved');  // Only count approved reviews
        
        const resorts = {
            'Taj Coral Reef Resort & Spa': 'rating-taj',
            'Baros Maldives': 'rating-baros',
            'Meeru Island Resort': 'rating-meeru'
        };
        
        for (let resort in resorts) {
            const resortReviews = reviews.filter(r => r.resort_name === resort);
            const element = document.getElementById(resorts[resort]);
            
            if (element) {
                if (resortReviews.length > 0) {
                    const avg = resortReviews.reduce((sum, r) => sum + r.rating, 0) / resortReviews.length;
                    element.innerHTML = `${avg.toFixed(1)}/10 (${resortReviews.length} ${resortReviews.length === 1 ? 'review' : 'reviews'})`;
                    element.style.color = avg >= 7 ? 'green' : avg >= 4 ? 'orange' : 'red';
                } else {
                    element.innerHTML = 'No reviews yet';
                    element.style.color = '#666';
                }
            }
        }
        
        const reviewCountDiv = document.querySelector('.stats-info p');
        if (reviewCountDiv) {
            reviewCountDiv.innerHTML = reviews.length;
        }
        
    } catch (error) {
        console.error("Error calculating averages:", error);
    }
}

// ===========================================
// HANDLE FORM SUBMISSION (NEW REVIEWS ARE PENDING)
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reviewForm');
    const messageDiv = document.getElementById('message');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const { createClient } = supabase;
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            const resort_name = document.getElementById('resort_name').value.trim();
            const rating = parseInt(document.getElementById('rating').value);
            const review_text = document.getElementById('review_text').value.trim();
            const photoFiles = document.getElementById('photos').files;
            
            messageDiv.innerHTML = "⏳ Submitting...";
            messageDiv.style.color = "blue";
            messageDiv.style.display = "block";
            
            try {
                let photoUrls = [];
                
                if (photoFiles.length > 0) {
                    const maxPhotos = Math.min(photoFiles.length, 3);
                    
                    for (let i = 0; i < maxPhotos; i++) {
                        const file = photoFiles[i];
                        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                        const fileName = `${Date.now()}_${i}_${cleanFileName}`;
                        
                        const { error } = await supabaseClient.storage
                            .from('resort-photos')
                            .upload(`public/${fileName}`, file);
                        
                        if (error) throw error;
                        
                        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/resort-photos/public/${fileName}`;
                        photoUrls.push(publicUrl);
                    }
                }
                
                // Submit review with status = 'pending'
                const { error } = await supabaseClient
                    .from('reviews')
                    .insert([{ 
                        resort_name, 
                        rating, 
                        review_text,
                        photo_urls: JSON.stringify(photoUrls),
                        status: 'pending'  // New reviews start as pending
                    }]);
                
                if (error) throw error;
                
                messageDiv.innerHTML = "✅ Review submitted for moderation! It will appear once approved.";
                messageDiv.style.color = "green";
                messageDiv.className = "message success";
                form.reset();
                
            } catch (error) {
                messageDiv.innerHTML = "❌ Error: " + error.message;
                messageDiv.style.color = "red";
                messageDiv.className = "message error";
            }
        });
    }
});