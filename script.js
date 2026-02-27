// Your Supabase credentials
const SUPABASE_URL = "https://yaqtahzosvsrvbzurhgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_syHNOYJ3kCbtLTwXI_wWiA_D-NYvwXl";

console.log("🚀 Starting with photo uploads...");

window.addEventListener('load', async function() {
    try {
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        console.log("✅ Connected to Supabase");
        
        // Load everything
        await loadAndDisplayReviews(supabaseClient);
        await calculateAndDisplayAverages(supabaseClient);
        
    } catch (err) {
        console.error("💥 Error:", err);
    }
});

// ===========================================
// LOAD AND DISPLAY REVIEWS WITH PHOTOS
// ===========================================
async function loadAndDisplayReviews(supabase) {
    console.log("🔍 Loading reviews with photos...");
    
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log("✅ Reviews loaded:", reviews);
        
        const reviewsList = document.getElementById('reviews-list');
        if (reviews && reviews.length > 0) {
            let html = '<h3>📝 Recent Reviews:</h3>';
            
            for (const review of reviews) {
                const date = new Date(review.created_at);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                
                // Get photos for this review
                let photosHtml = '';
                if (review.photo_urls && review.photo_urls.length > 0) {
                    photosHtml = '<div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">';
                    
                    // Parse photo URLs (they're stored as JSON array)
                    let photoUrls = [];
                    try {
                        photoUrls = JSON.parse(review.photo_urls);
                    } catch (e) {
                        photoUrls = review.photo_urls || [];
                    }
                    
                    photoUrls.forEach(url => {
                        photosHtml += `
                            <div style="width:100px; height:100px; overflow:hidden; border-radius:8px; border:2px solid #ddd;">
                                <img src="${url}" style="width:100%; height:100%; object-fit:cover;" 
                                     onclick="window.open('${url}')" style="cursor:pointer;">
                            </div>
                        `;
                    });
                    
                    photosHtml += '</div>';
                }
                
                html += `
                    <div style="background:white; padding:15px; margin:10px 0; border-radius:8px; border-left:4px solid #0070f3;">
                        <h3 style="margin:0 0 5px 0;">${review.resort_name}</h3>
                        <div style="color:#0070f3; font-weight:bold;">⭐ ${review.rating}/10</div>
                        <p style="font-style:italic; margin:10px 0;">"${review.review_text}"</p>
                        ${photosHtml}
                        <small style="color:#666;">${formattedDate}</small>
                    </div>
                `;
            }
            
            reviewsList.innerHTML = html;
        } else {
            reviewsList.innerHTML = '<p>📭 No reviews yet. Be the first to add one!</p>';
        }
        
    } catch (error) {
        console.error("Error loading reviews:", error);
        document.getElementById('reviews-list').innerHTML = '<p style="color:red">Error loading reviews</p>';
    }
}

// ===========================================
// CALCULATE AND DISPLAY AVERAGES
// ===========================================
async function calculateAndDisplayAverages(supabase) {
    console.log("📊 Calculating averages...");
    
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('resort_name, rating');
        
        if (error) throw error;
        
        // Calculate averages for each resort
        const resorts = {
            'Taj Coral Reef Resort & Spa': { total: 0, count: 0, elementId: 'rating-taj' },
            'Baros Maldives': { total: 0, count: 0, elementId: 'rating-baros' },
            'Meeru Island Resort': { total: 0, count: 0, elementId: 'rating-meeru' }
        };
        
        reviews.forEach(review => {
            if (resorts[review.resort_name]) {
                resorts[review.resort_name].total += review.rating;
                resorts[review.resort_name].count++;
            }
        });
        
        // Update displays
        for (let resort in resorts) {
            const element = document.getElementById(resorts[resort].elementId);
            if (element) {
                if (resorts[resort].count > 0) {
                    const avg = resorts[resort].total / resorts[resort].count;
                    element.innerHTML = `${avg.toFixed(1)}/10 (${resorts[resort].count} ${resorts[resort].count === 1 ? 'review' : 'reviews'})`;
                    element.style.color = avg >= 7 ? 'green' : avg >= 4 ? 'orange' : 'red';
                } else {
                    element.innerHTML = 'No reviews yet';
                    element.style.color = '#666';
                }
            }
        }
        
        // Update total count
        const reviewCountDiv = document.getElementById('review-count');
        if (reviewCountDiv) {
            reviewCountDiv.innerHTML = `📊 Total Reviews: ${reviews.length}`;
        }
        
    } catch (error) {
        console.error("Error calculating averages:", error);
    }
}

// ===========================================
// HANDLE FORM SUBMISSION WITH PHOTO UPLOADS
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
            
            messageDiv.innerHTML = "⏳ Submitting review and uploading photos...";
            messageDiv.style.color = "blue";
            
            try {
                // Upload photos first (if any)
                let photoUrls = [];
                
                if (photoFiles.length > 0) {
                    console.log(`📸 Uploading ${photoFiles.length} photos...`);
                    
                    // Limit to 3 photos
                    const maxPhotos = Math.min(photoFiles.length, 3);
                    
                    for (let i = 0; i < maxPhotos; i++) {
                        const file = photoFiles[i];
                        const fileName = `${Date.now()}_${i}_${file.name}`;
                        
                        console.log(`Uploading photo ${i+1}:`, fileName);
                        
                        const { data, error } = await supabaseClient.storage
                            .from('resort-photos')
                            .upload(`public/${fileName}`, file);
                        
                        if (error) {
                            console.error("Photo upload error:", error);
                            throw new Error(`Failed to upload photo ${i+1}: ${error.message}`);
                        }
                        
                        // Get public URL
                        const { data: { publicUrl } } = supabaseClient.storage
                            .from('resort-photos')
                            .getPublicUrl(`public/${fileName}`);
                        
                        photoUrls.push(publicUrl);
                        console.log(`✅ Photo ${i+1} uploaded:`, publicUrl);
                    }
                }
                
                // Submit review with photo URLs
                console.log("Submitting review with photos:", photoUrls);
                
                const { error } = await supabaseClient
                    .from('reviews')
                    .insert([{ 
                        resort_name, 
                        rating, 
                        review_text,
                        photo_urls: JSON.stringify(photoUrls) // Store as JSON array
                    }]);
                
                if (error) throw error;
                
                messageDiv.innerHTML = "✅ Review with photos added! Refreshing...";
                messageDiv.style.color = "green";
                form.reset();
                
                setTimeout(() => {
                    location.reload();
                }, 2000);
                
            } catch (error) {
                console.error("Submit error:", error);
                messageDiv.innerHTML = "❌ Error: " + error.message;
                messageDiv.style.color = "red";
            }
        });
    }
});