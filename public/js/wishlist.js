
        // Animation on scroll
        function animateOnScroll() {
            const items = document.querySelectorAll('.wishlist-item');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('opacity-0', 'translate-y-12');
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                    }
                });
            }, {
                threshold: 0.1
            });

            items.forEach(item => {
                observer.observe(item);
            });
        }

        // Show loading overlay
        function showLoading() {
            document.getElementById('loadingOverlay').classList.remove('hidden');
            document.getElementById('loadingOverlay').classList.add('flex');
        }

        // Hide loading overlay
        function hideLoading() {
            document.getElementById('loadingOverlay').classList.add('hidden');
            document.getElementById('loadingOverlay').classList.remove('flex');
        }

        // Remove item from wishlist with animation
        async function removeFromWishlist(itemId) {
            const item = document.querySelector(`[data-item-id="${itemId}"]`);
            
            if (!item) return;

            // Confirm removal
            if (!confirm('Are you sure you want to remove this item from your wishlist?')) {
                return;
            }

            try {
                // Add removing animation
                item.classList.add('scale-75', 'opacity-0', 'rotate-12');
                item.style.transition = 'all 0.5s ease';

                // Show loading
                showLoading();

                // Wait for animation to complete
                setTimeout(async () => {
                    try {
                        // Make API call to remove from backend
                        const response = await fetch(`/wishlist/remove/${itemId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });

                        hideLoading();

                        if (response.ok) {
                            // Remove from DOM
                            item.remove();
                            
                            // Update stats
                            updateStats();
                            
                            // Show success message
                            showNotification('Item removed from wishlist!', 'success');
                            
                            // Check if wishlist is now empty
                            const remainingItems = document.querySelectorAll('[data-item-id]');
                            if (remainingItems.length === 0) {
                                setTimeout(() => {
                                    location.reload(); // Reload to show empty state
                                }, 1000);
                            }
                        } else {
                            // Revert animation on error
                            item.classList.remove('scale-75', 'opacity-0', 'rotate-12');
                            showNotification('Failed to remove item. Please try again.', 'error');
                        }
                    } catch (error) {
                        hideLoading();
                        console.error('Error removing item:', error);
                        item.classList.remove('scale-75', 'opacity-0', 'rotate-12');
                        showNotification('Failed to remove item. Please try again.', 'error');
                    }
                }, 500);

            } catch (error) {
                hideLoading();
                console.error('Error removing item:', error);
                showNotification('Failed to remove item. Please try again.', 'error');
            }
        }

        // Quick view functionality
        function quickView(itemId) {
            // You can implement a modal or redirect to product page
            window.open(`/product/${itemId}`, '_blank');
        }

        // Update statistics
        function updateStats() {
            const items = document.querySelectorAll('[data-item-id]');
            const statsElements = document.querySelectorAll('.text-3xl.font-bold');
            
            if (statsElements.length >= 1) {
                // Update item count with animation
                const countElement = statsElements[0];
                countElement.classList.add('animate-pulse-scale');
                countElement.textContent = items.length;
                
                setTimeout(() => {
                    countElement.classList.remove('animate-pulse-scale');
                }, 2000);
            }
        }

        // Show notification
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
            
            notification.className = `fixed top-5 right-5 ${bgColor} text-white px-6 py-4 rounded-xl font-semibold z-50 shadow-xl animate-slide-in-right`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.classList.remove('animate-slide-in-right');
                notification.classList.add('animate-slide-out-right');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        // Add to cart functionality
        async function addToCart(itemId) {
            try {
                showLoading();
                
                const response = await fetch('/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ productId: itemId, quantity: 1 })
                });

                hideLoading();

                if (response.ok) {
                    showNotification('Item added to cart!', 'success');
                } else {
                    showNotification('Failed to add item to cart.', 'error');
                }
            } catch (error) {
                hideLoading();
                console.error('Error adding to cart:', error);
                showNotification('Failed to add item to cart.', 'error');
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Add staggered animation to items
            const items = document.querySelectorAll('[data-item-id]');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.remove('opacity-0', 'translate-y-12');
                    item.classList.add('opacity-100', 'translate-y-0');
                }, index * 100);
            });

            // Initialize scroll animations
            animateOnScroll();

            // Add intersection observer for better performance
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                                imageObserver.unobserve(img);
                            }
                        }
                    });
                });

                document.querySelectorAll('img[data-src]').forEach(img => {
                    imageObserver.observe(img);
                });
            }
        });

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close any open modals or overlays
                hideLoading();
            }
        });

        // Add touch gestures for mobile
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', function(e) {
            if (!touchStartX || !touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;

            // Reset values
            touchStartX = 0;
            touchStartY = 0;

            // Swipe left to remove (optional feature)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 100) {
                const target = e.target.closest('[data-item-id]');
                if (target && diffX > 0) {
                    // Swipe left detected on wishlist item
                    const itemId = target.getAttribute('data-item-id');
                    if (confirm('Remove this item from wishlist?')) {
                        removeFromWishlist(itemId);
                    }
                }
            }
        });
