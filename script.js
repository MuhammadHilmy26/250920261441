let currentUser = null;
const adminEmail = "databasechat@muhammadhilmy.iam.gserviceaccount.com"; // Email Service Account / Admin
let mapInstance = null;
let watchId = null;

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));

    if (tabName === 'home') {
        document.getElementById('page-home').classList.add('active');
        document.querySelectorAll('.sub-nav button')[0].classList.add('active');
        stopLocationTracking();
    } else if (tabName === 'location') {
        document.getElementById('page-location').classList.add('active');
        document.querySelectorAll('.sub-nav button')[1].classList.add('active');
    }
}

// Fitur Validasi Geolocation & Proteksi Halaman
function checkLocationAccess() {
    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung Geolocation.");
        return;
    }

    // Cek izin lokasi secara real-time
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Jika diizinkan, pindah ke halaman lokasi
            switchTab('location');
            initMap(position.coords.latitude, position.coords.longitude);
            startRealtimeTracking();
        },
        (error) => {
            // Jika ditolak atau tidak aktif, kembalikan ke home
            alert("Akses lokasi wajib diaktifkan untuk masuk ke halaman ini!");
            switchTab('home');
        },
        { enableHighAccuracy: true }
    );
}

// Inisialisasi Peta Leaflet
function initMap(lat, lng) {
    const mapDiv = document.getElementById('map');
    if (mapInstance) {
        mapInstance.remove();
    }
    mapInstance = L.map(mapDiv).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(mapInstance);

    L.marker([lat, lng]).addTo(mapInstance)
        .bindPopup("Lokasi Terkini Anda").openPopup();
}

// Real-time tracking lokasi
function startRealtimeTracking() {
    if (watchId) navigator.geolocation.clearWatch(watchId);

    watchId = navigator.geolocation.watchPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        document.getElementById('coord-info').innerText = `Latitude: ${lat}, Longitude: ${lng}`;
        if (mapInstance) {
            mapInstance.setView([lat, lng]);
        }
    }, (error) => {
        console.error("Gagal melacak lokasi:", error);
    }, { enableHighAccuracy: true });
}

function stopLocationTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

// Modal Upload
function openUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
}

// Manajemen Postingan & Kedaluwarsa 30 Hari (LocalStorage Simulation)
function submitPost() {
    const fileInput = document.getElementById('media-file');
    const captionInput = document.getElementById('media-caption');

    if (fileInput.files.length === 0) {
        alert("Pilih foto atau video terlebih dahulu!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const posts = JSON.parse(localStorage.getItem('geo_posts') || '[]');
        
        const newPost = {
            id: Date.now(),
            mediaUrl: e.target.result,
            mediaType: file.type.startsWith('video') ? 'video' : 'image',
            caption: captionInput.value,
            timestamp: new Date().getTime(), // Simpan waktu posting
            user: currentUser ? currentUser.email : "Anonim"
        };

        posts.unshift(newPost);
        localStorage.setItem('geo_posts', JSON.stringify(posts));

        fileInput.value = '';
        captionInput.value = '';
        closeUploadModal();
        loadPosts();
    };

    reader.readAsDataURL(file);
}

// Filter postingan (Hanya tampilkan yang berumur < 30 hari)
function loadPosts() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '';

    const posts = JSON.parse(localStorage.getItem('geo_posts') || '[]');
    const now = new Date().getTime();
    const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;

    // Filter otomatis hapus/abaikan postingan > 30 hari
    const validPosts = posts.filter(post => (now - post.timestamp) < thirtyDaysInMillis);
    
    // Perbarui penyimpanan jika ada yang terhapus
    localStorage.setItem('geo_posts', JSON.stringify(validPosts));

    if (validPosts.length === 0) {
        feedList.innerHTML = '<p style="text-align:center;">Belum ada postingan atau sudah kedaluwarsa (30 hari).</p>';
        return;
    }

    validPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'feed-card';

        let mediaElement = post.mediaType === 'video' 
            ? `<video controls src="${post.mediaUrl}"></video>` 
            : `<img src="${post.mediaUrl}" alt="Post">`;

        let deleteBtn = '';
        // Cek hak akses admin
        if (currentUser && (currentUser.email === adminEmail || currentUser.isAdmin)) {
            deleteBtn = `<button onclick="deletePost(${post.id})" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; float:right;">Hapus (Admin)</button>`;
        }

        card.innerHTML = `
            <small>Diposting oleh: <b>${post.user}</b></small>
            ${deleteBtn}
            <div style="margin-top: 10px;">${mediaElement}</div>
            <p>${post.caption}</p>
        `;
        feedList.appendChild(card);
    });
}

function deletePost(id) {
    let posts = JSON.parse(localStorage.getItem('geo_posts') || '[]');
    posts = posts.filter(post => post.id !== id);
    localStorage.setItem('geo_posts', JSON.stringify(posts));
    loadPosts();
}

// Simulasi Login Google & Validasi Admin
function loginGoogle() {
    // Simulasi prompt akun google (bisa diintegrasikan Firebase Auth SDK asli)
    const emailMasuk = prompt("Simulasi Login Google. Masukkan email Anda:", "user@gmail.com");
    if (!emailMasuk) return;

    currentUser = {
        email: emailMasuk,
        isAdmin: emailMasuk === adminEmail || emailMasuk.includes("admin")
    };

    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('user-profile').style.display = 'inline-block';
    document.getElementById('user-name').innerText = currentUser.email;

    loadPosts();
}

function logoutGoogle() {
    currentUser = null;
    document.getElementById('btn-login').style.display = 'inline-block';
    document.getElementById('user-profile').style.display = 'none';
    loadPosts();
}

// Load feed saat halaman pertama kali dibuka
window.onload = function() {
    loadPosts();
};
