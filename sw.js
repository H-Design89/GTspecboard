// Service Worker đơn giản để kích hoạt tính năng Cài đặt ứng dụng (PWA)
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Không cache gì cả, luôn lấy từ mạng để đảm bảo dữ liệu luôn mới
    // Chỉ cần file này tồn tại để Chrome nhận diện là PWA
});
