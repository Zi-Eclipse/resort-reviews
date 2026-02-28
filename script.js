// Your Supabase credentials
const SUPABASE_URL = "https://yaqtahzosvsrvbzurhgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_syHNOYJ3kCbtLTwXI_wWiA_D-NYvwXl";

console.log("🚀 Facebook-style Resort Reviews");

let allReviews = [];

window.addEventListener('load', async function() {
    try {
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        await loadApprovedReviews(supabaseClient);
        await loadResortRankings(supabaseClient);
        await loadTopResorts(supabaseClient);
        setupSearch();
        
    } catch (err) {
        console.error("Error:", err);
    }
});

async function loadApprovedReviews(supabase) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        allReviews = reviews || [];
        displayReviews(allReviews);
        document.getElementById('review-count').textContent = `${allReviews.length} reviews`;
        
    } catch (error) {
        console.error("Error loading reviews:", error);
    }
}

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
                    <h3>${review.resort_name}</h3>
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

async function loadResortRankings(supabase) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('resort_name, rating')
            .eq('status', 'approved');
        
        // Calculate averages
        const resortRatings = {};
        reviews.forEach(r => {
            if (!resortRatings[r.resort_name]) {
                resortRatings[r.resort_name] = { total: 0, count: 0 };
            }
            resortRatings[r.resort_name].total += r.rating;
            resortRatings[r.resort_name].count++;
        });
        
        // Convert to array and sort by average
        const sorted = Object.entries(resortRatings)
            .map(([name, data]) => ({
                name,
                avg: data.total / data.count,
                count: data.count
            }))
            .sort((a, b) => b.avg - a.avg);
        
        // Display in right sidebar
        const resortList = document.querySelector('.resort-list');
        if (!resortList) return;
        
        let html = '';
        sorted.forEach((resort, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'rank-1';
            else if (index === 1) rankClass = 'rank-2';
            else if (index === 2) rankClass = 'rank-3';
            
            html += `
                <div class="resort-list-item">
                    <div class="rank-badge ${rankClass}">${index + 1}</div>
                    <div class="resort-info">
                        <div class="resort-name">${resort.name}</div>
                        <div class="resort-rating">⭐ ${resort.avg.toFixed(1)} (${resort.count} reviews)</div>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
        });
        
        resortList.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading rankings:", error);
    }
}

async function loadTopResorts(supabase) {
    try {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('resort_name, rating')
            .eq('status', 'approved');
        
        // Calculate averages
        const resortRatings = {};
        reviews.forEach(r => {
            if (!resortRatings[r.resort_name]) {
                resortRatings[r.resort_name] = { total: 0, count: 0 };
            }
            resortRatings[r.resort_name].total += r.rating;
            resortRatings[r.resort_name].count++;
        });
        
        // Get top 3
        const sorted = Object.entries(resortRatings)
            .map(([name, data]) => ({
                name,
                avg: data.total / data.count
            }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 3);
        
        const rankingsDiv = document.getElementById('topResorts');
        if (!rankingsDiv) return;
        
        let html = '';
        sorted.forEach((resort, index) => {
            html += `
                <div class="ranking-item">
                    <div class="rank">#${index + 1}</div>
                    <div class="name">${resort.name.split(' ')[0]}</div>
                    <div class="rating">⭐ ${resort.avg.toFixed(1)}</div>
                </div>
            `;
        });
        
        rankingsDiv.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading top resorts:", error);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase().trim();
            if (term === '') {
                displayReviews(allReviews);
            } else {
                const filtered = allReviews.filter(r => 
                    r.resort_name.toLowerCase().includes(term)
                );
                displayReviews(filtered);
            }
        });
    }
}

// Form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reviewForm');
    const messageDiv = document.getElementById('message');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const { createClient } = supabase;
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
            
            const resort_name = document.getElementById('resort_name').value;
            const rating = parseInt(document.getElementById('rating').value);
            const review_text = document.getElementById('review_text').value.trim();
            const photoFiles = document.getElementById('photos').files;
            
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
                
                const { error } = await supabaseClient
                    .from('reviews')
                    .insert([{ 
                        resort_name, 
                        rating, 
                        review_text,
                        photo_urls: JSON.stringify(photoUrls),
                        status: 'pending'
                    }]);
                
                if (error) throw error;
                
                messageDiv.textContent = "✅ Review submitted for moderation!";
                messageDiv.className = "message success";
                form.reset();
                document.getElementById('photoPreview').innerHTML = '';
                
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                    document.getElementById('reviewFormContainer').style.display = 'none';
                }, 3000);
                
            } catch (error) {
                messageDiv.textContent = "Error: " + error.message;
                messageDiv.className = "message error";
            }
        });
    }
});