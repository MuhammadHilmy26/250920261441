// Konfigurasi Firebase Project Anda
const firebaseConfig = {
    apiKey: "AIzaSyChjm_brzDENv5nRJHrnedBr8JH1mCa2Zo",
    authDomain: "for-a-break.firebaseapp.com",
    projectId: "for-a-break",
    storageBucket: "for-a-break.firebasestorage.app",
    messagingSenderId: "407244603896",
    appId: "1:407244603896:web:6a49c2a8cc58c20622d60d",
    measurementId: "G-4FMCQ17CG5"
};

// Inisialisasi Firebase Compat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const adminEmail = "databasechat@muhammadhilmy.iam.gserviceaccount.com";
let currentUser = null;
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

// Cek Izin Geolocation
function checkLocationAccess() {
    if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung Geolocation.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            switchTab('location');
            initMap(position.coords.latitude, position.coords.longitude);
            startRealtimeTracking();
        },
        (error) => {
            alert("Akses lokasi wajib diaktifkan untuk masuk ke halaman ini!");
            switchTab('home');
        },
        { enableHighAccuracy: true }
    );
}

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

// SIMPAN POSTINGAN KE DATABASE FIRESTORE
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
        const newPost = {
            mediaUrl: e.target.result,
            mediaType: file.type.startsWith('video') ? 'video' : 'image',
            caption: captionInput.value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            rawTime: new Date().getTime(),
            user: currentUser ? currentUser.email : "Anonim"
        };

        db.collection("posts").add(newPost).then(() => {
            fileInput.value = '';
            captionInput.value = '';
            closeUploadModal();
            loadPosts();
        }).catch((error) => {
            alert("Gagal mengunggah postingan: " + error.message);
        });
    };

    reader.readAsDataURL(file);
}

// AMBIL POSTINGAN DARI FIRESTORE & FILTER 30 HARI
function loadPosts() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '<p style="text-align:center;">Memuat postingan...</p>';

    db.collection("posts").orderBy("rawTime", "desc").get().then((querySnapshot) => {
        feedList.innerHTML = '';
        const now = new Date().getTime();
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        let hasValidPost = false;

        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postId = doc.id;

            if ((now - post.rawTime) < thirtyDaysInMillis) {
                hasValidPost = true;
                const card = document.createElement('div');
                card.className = 'feed-card';

                let mediaElement = post.mediaType === 'video' 
                    ? `<video controls src="${post.mediaUrl}"></video>` 
                    : `<img src="${post.mediaUrl}" alt="Post">`;

                let deleteBtn = '';
                if (currentUser && currentUser.email === adminEmail) {
                    deleteBtn = `<button onclick="deletePost('${postId}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; float:right;">Hapus (Admin)</button>`;
                }

                card.innerHTML = `
                    <small>Diposting oleh: <b>${post.user}</b></small>
                    ${deleteBtn}
                    <div style="margin-top: 10px;">${mediaElement}</div>
                    <p>${post.caption}</p>
                `;
                feedList.appendChild(card);
            } else {
                db.collection("posts").doc(postId).delete();
            }
        });

        if (!hasValidPost) {
            feedList.innerHTML = '<p style="text-align:center;">Belum ada postingan atau sudah kedaluwarsa (30 hari).</p>';
        }
    }).catch((error) => {
        console.error("Gagal memuat post:", error);
        feedList.innerHTML = '<p style="text-align:center;">Gagal memuat data dari database.</p>';
    });
}

function deletePost(id) {
    if (confirm("Yakin ingin menghapus postingan ini?")) {
        db.collection("posts").doc(id).delete().then(() => {
            loadPosts();
        });
    }
}

// LOGIN GOOGLE
function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        currentUser = result.user;
        updateAuthUI();
        loadPosts();
    }).catch((error) => {
        alert("Login gagal: " + error.message);
    });
}

function logoutGoogle() {
    auth.signOut().then(() => {
        currentUser = null;
        updateAuthUI();
        loadPosts();
    });
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('user-profile').style.display = 'inline-block';
        document.getElementById('user-name').innerText = currentUser.email;
    } else {
        document.getElementById('btn-login').style.display = 'inline-block';
        document.getElementById('user-profile').style.display = 'none';
    }
}

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        currentUser = null;
    }
    updateAuthUI();
    loadPosts();
});
