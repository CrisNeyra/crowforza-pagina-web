// ===== CROWFORZA - JavaScript Principal =====

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar todas las funcionalidades
    initTheme();
    initNavigation();
    initSearch();
    initCatalog();
    initFilters();
    initModal();
    initScrollEffects();
    initForms();
    initAnimations();
    initVideoFallback();
});

// ========== TEMA CLARO/OSCURO ==========
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Verificar tema guardado o preferencia del sistema
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Animación del icono
        themeIcon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeIcon.style.transform = 'rotate(0deg)';
        }, 300);
    });
    
    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
}

// ========== NAVEGACIÓN MÓVIL ==========
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');
    
    // Abrir menú
    navToggle.addEventListener('click', () => {
        navMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Cerrar menú
    navClose.addEventListener('click', closeMenu);
    
    // Cerrar al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
            // Actualizar enlace activo
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !navToggle.contains(e.target)) {
            closeMenu();
        }
    });
    
    function closeMenu() {
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========== SISTEMA DE BÚSQUEDA ==========
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchClear = document.getElementById('search-clear');
    const searchBtn = document.getElementById('search-btn');
    
    let searchTimeout;
    
    // Búsqueda en tiempo real
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Mostrar/ocultar botón de limpiar
        searchClear.style.display = query.length > 0 ? 'block' : 'none';
        
        // Debounce para mejorar rendimiento
        clearTimeout(searchTimeout);
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        } else {
            hideSearchResults();
        }
    });
    
    // Limpiar búsqueda
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        hideSearchResults();
        searchInput.focus();
    });
    
    // Búsqueda al presionar Enter o clic en botón
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            performSearch(query);
            scrollToCatalog();
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                performSearch(query);
                scrollToCatalog();
                hideSearchResults();
            }
        }
    });
    
    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && 
            !searchInput.contains(e.target)) {
            hideSearchResults();
        }
    });
    
    function performSearch(query) {
        const results = searchProducts(query);
        displaySearchResults(results, query);
    }
    
    function searchProducts(query) {
        const searchTerms = query.toLowerCase().split(' ');
        
        return products.filter(product => {
            const searchableText = `
                ${product.name} 
                ${product.category} 
                ${product.description}
            `.toLowerCase();
            
            return searchTerms.every(term => searchableText.includes(term));
        }).slice(0, 6); // Limitar a 6 resultados
    }
    
    function displaySearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No se encontraron resultados para "${query}"</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(product => `
                <div class="search-result-item" data-id="${product.id}">
                    <img src="${product.image}" alt="${product.name}" class="search-result-image">
                    <div class="search-result-info">
                        <h4>${highlightMatch(product.name, query)}</h4>
                        <span class="category">${capitalize(product.category)}</span>
                        <span class="price">$${product.price.toLocaleString('es-AR')}</span>
                    </div>
                </div>
            `).join('');
            
            // Agregar eventos de clic a los resultados
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const productId = parseInt(item.dataset.id);
                    openProductModal(productId);
                    hideSearchResults();
                });
            });
        }
        
        showSearchResults();
    }
    
    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    function showSearchResults() {
        searchResults.classList.add('active');
    }
    
    function hideSearchResults() {
        searchResults.classList.remove('active');
    }
    
    function scrollToCatalog() {
        const catalog = document.getElementById('catalog');
        if (catalog) {
            catalog.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// ========== CATÁLOGO DE PRODUCTOS ==========
let currentFilter = 'all';
let currentSort = 'featured';
let displayedProducts = 8;

function initCatalog() {
    renderProducts();
    initLoadMore();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    let filteredProducts = filterProducts();
    filteredProducts = sortProducts(filteredProducts);
    
    const productsToShow = filteredProducts.slice(0, displayedProducts);
    
    grid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    
    // Mostrar/ocultar botón de cargar más
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = filteredProducts.length > displayedProducts ? 'inline-flex' : 'none';
    }
    
    // Agregar eventos a las tarjetas
    initProductCardEvents();
}

function filterProducts() {
    if (currentFilter === 'all') {
        return [...products];
    }
    return products.filter(p => p.category === currentFilter);
}

function sortProducts(productList) {
    const sorted = [...productList];
    
    switch (currentSort) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'featured':
        default:
            sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
            break;
    }
    
    return sorted;
}

function createProductCard(product) {
    const badgeHTML = product.badge ? 
        `<span class="product-card__badge ${product.badge}">${getBadgeText(product.badge)}</span>` : '';
    
    const oldPriceHTML = product.oldPrice ? 
        `<span class="product-card__price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : '';
    
    const starsHTML = generateStars(product.rating);
    
    return `
        <article class="product-card" data-id="${product.id}" data-category="${product.category}">
            ${badgeHTML}
            <button class="product-card__wishlist" aria-label="Añadir a favoritos">
                <i class="fa-regular fa-heart"></i>
            </button>
            <div class="product-card__image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <div class="product-card__actions">
                    <button class="product-card__action" data-action="quick-view">
                        <i class="fa-regular fa-eye"></i>
                        Ver
                    </button>
                    <button class="product-card__action primary" data-action="add-cart">
                        <i class="fa-solid fa-cart-plus"></i>
                        Añadir
                    </button>
                </div>
            </div>
            <div class="product-card__content">
                <span class="product-card__category">${capitalize(product.category)}</span>
                <h3 class="product-card__title">${product.name}</h3>
                <div class="product-card__rating">
                    <div class="product-card__stars">${starsHTML}</div>
                    <span class="product-card__reviews">(${product.reviews})</span>
                </div>
                <div class="product-card__price">
                    <span class="product-card__price-current">$${product.price.toLocaleString('es-AR')}</span>
                    ${oldPriceHTML}
                </div>
            </div>
        </article>
    `;
}

function getBadgeText(badge) {
    const badges = {
        'new': 'Nuevo',
        'sale': 'Oferta',
        'hot': 'Popular'
    };
    return badges[badge] || badge;
}

function generateStars(rating) {
    let starsHTML = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fa-solid fa-star"></i>';
    }
    
    if (hasHalfStar) {
        starsHTML += '<i class="fa-solid fa-star-half-stroke"></i>';
    }
    
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="fa-regular fa-star"></i>';
    }
    
    return starsHTML;
}

function initProductCardEvents() {
    // Botones de wishlist
    document.querySelectorAll('.product-card__wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            icon.classList.toggle('fa-regular');
            icon.classList.toggle('fa-solid');
            
            if (btn.classList.contains('active')) {
                showToast('Añadido a favoritos', 'success');
            } else {
                showToast('Eliminado de favoritos', 'info');
            }
        });
    });
    
    // Botones de acción
    document.querySelectorAll('.product-card__action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.product-card');
            const productId = parseInt(card.dataset.id);
            const action = btn.dataset.action;
            
            if (action === 'quick-view') {
                openProductModal(productId);
            } else if (action === 'add-cart') {
                addToCart(productId);
            }
        });
    });
    
    // Clic en la tarjeta
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = parseInt(card.dataset.id);
            openProductModal(productId);
        });
    });
}

function initLoadMore() {
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayedProducts += 8;
            renderProducts();
            
            // Animar los nuevos productos
            setTimeout(() => {
                const newCards = document.querySelectorAll('.product-card');
                newCards.forEach((card, index) => {
                    if (index >= displayedProducts - 8) {
                        card.style.animation = 'slideInUp 0.5s ease forwards';
                    }
                });
            }, 100);
        });
    }
}

// ========== FILTROS ==========
function initFilters() {
    // Filtros por categoría
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayedProducts = 8;
            renderProducts();
        });
    });
    
    // Ordenamiento
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderProducts();
        });
    }
    
    // Categorías clickeables
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentFilter = category;
            displayedProducts = 8;
            
            // Actualizar botones de filtro
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === category);
            });
            
            renderProducts();
            
            // Scroll al catálogo
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ========== MODAL DE PRODUCTO ==========
function initModal() {
    const modal = document.getElementById('product-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = modal.querySelector('.modal__overlay');
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
    
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');
    
    const oldPriceHTML = product.oldPrice ? 
        `<span class="modal__price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : '';
    
    modalBody.innerHTML = `
        <div class="modal__image">
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="modal__info">
            <span class="modal__category">${capitalize(product.category)}</span>
            <h2 class="modal__title">${product.name}</h2>
            <div class="modal__rating">
                <div class="modal__stars">${generateStars(product.rating)}</div>
                <span class="modal__reviews">${product.reviews} valoraciones</span>
            </div>
            <div class="modal__price">
                <span class="modal__price-current">$${product.price.toLocaleString('es-AR')}</span>
                ${oldPriceHTML}
            </div>
            <p class="modal__description">${product.description}</p>
            <div class="modal__quantity">
                <label>Cantidad:</label>
                <div class="quantity-control">
                    <button class="quantity-btn minus"><i class="fa-solid fa-minus"></i></button>
                    <input type="number" value="1" min="1" max="10" class="quantity-input">
                    <button class="quantity-btn plus"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <div class="modal__buttons">
                <button class="btn btn--primary" data-action="add-cart" data-id="${product.id}">
                    <i class="fa-solid fa-cart-plus"></i>
                    Añadir al Carrito
                </button>
                <button class="btn btn--outline" data-action="wishlist">
                    <i class="fa-regular fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    // Eventos del modal
    initModalEvents(product.id);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function initModalEvents(productId) {
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    const quantityInput = document.querySelector('.quantity-input');
    const addCartBtn = document.querySelector('.modal__buttons [data-action="add-cart"]');
    const wishlistBtn = document.querySelector('.modal__buttons [data-action="wishlist"]');
    
    minusBtn.addEventListener('click', () => {
        const current = parseInt(quantityInput.value);
        if (current > 1) quantityInput.value = current - 1;
    });
    
    plusBtn.addEventListener('click', () => {
        const current = parseInt(quantityInput.value);
        if (current < 10) quantityInput.value = current + 1;
    });
    
    addCartBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        addToCart(productId, quantity);
        document.getElementById('product-modal').classList.remove('active');
        document.body.style.overflow = '';
    });
    
    wishlistBtn.addEventListener('click', () => {
        wishlistBtn.classList.toggle('active');
        const icon = wishlistBtn.querySelector('i');
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
        showToast('Añadido a favoritos', 'success');
    });
}

// ========== CARRITO ==========
let cart = [];

function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
    updateCartCount();
    showToast(`${product.name} añadido al carrito`, 'success');
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Animación
    cartCount.style.transform = 'scale(1.3)';
    setTimeout(() => {
        cartCount.style.transform = 'scale(1)';
    }, 200);
}

// ========== EFECTOS DE SCROLL ==========
function initScrollEffects() {
    const header = document.getElementById('header');
    const backToTop = document.getElementById('back-to-top');
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Header con sombra al hacer scroll
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Botón volver arriba
        if (currentScroll > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
        
        lastScroll = currentScroll;
    });
    
    // Volver arriba
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Navegación activa basada en scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (window.pageYOffset >= sectionTop && 
                window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ========== FORMULARIOS ==========
function initForms() {
    // Formulario de contacto
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Simular envío
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                contactForm.reset();
                showToast('Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
            }, 1500);
        });
    }
    
    // Formulario de newsletter
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const input = newsletterForm.querySelector('input');
            const email = input.value;
            
            if (validateEmail(email)) {
                showToast('¡Gracias por suscribirte! Revisa tu correo.', 'success');
                newsletterForm.reset();
            } else {
                showToast('Por favor, introduce un email válido.', 'error');
            }
        });
    }
    
    // Formularios del footer
    const footerForms = document.querySelectorAll('.footer__form');
    footerForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('input');
            
            if (validateEmail(input.value)) {
                showToast('¡Suscripción exitosa!', 'success');
                input.value = '';
            } else {
                showToast('Email inválido', 'error');
            }
        });
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ========== ANIMACIONES ==========
function initAnimations() {
    // Intersection Observer para animaciones al entrar en viewport
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar elementos animables
    const animatableElements = document.querySelectorAll(
        '.feature-card, .category-card, .product-card, .testimonial-card, .about__content, .about__images'
    );
    
    animatableElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Añadir estilos de animación
    const style = document.createElement('style');
    style.textContent = `
        .animated {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    const icons = {
        'success': 'fa-check',
        'error': 'fa-xmark',
        'info': 'fa-info'
    };
    
    toast.innerHTML = `
        <div class="toast__icon">
            <i class="fa-solid ${icons[type]}"></i>
        </div>
        <span class="toast__message">${message}</span>
        <button class="toast__close">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Cerrar toast
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Auto-cerrar después de 4 segundos
    setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
}

// ========== UTILIDADES ==========
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Función para cargar productos destacados en el slider (si se implementa)
function loadFeaturedProducts() {
    const featuredSlider = document.getElementById('featured-slider');
    if (!featuredSlider) return;
    
    const featured = products.filter(p => p.featured);
    
    featuredSlider.innerHTML = featured.map(product => createProductCard(product)).join('');
    initProductCardEvents();
}

// Inicializar productos destacados
loadFeaturedProducts();

// ========== VIDEO FALLBACK ==========
function initVideoFallback() {
    const video = document.getElementById('hero-video');
    const fallbackBg = document.querySelector('.hero__fallback-bg');
    
    if (video) {
        // Si el video no puede reproducirse, mostrar el fallback
        video.addEventListener('error', () => {
            video.style.display = 'none';
            if (fallbackBg) fallbackBg.style.zIndex = '0';
        });
        
        // Verificar si el video puede reproducirse
        video.play().catch(() => {
            video.style.display = 'none';
            if (fallbackBg) fallbackBg.style.zIndex = '0';
        });
    }
}

// ========== ABOUT SECTION SLIDESHOW ==========
function initAboutSlideshow() {
    const slides = document.querySelectorAll('.about__slide');
    const indicators = document.querySelectorAll('.about__indicator');
    
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    const intervalTime = 5000; // 5 segundos
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        slides[index].classList.add('active');
        indicators[index].classList.add('active');
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }
    
    let slideInterval = setInterval(nextSlide, intervalTime);
    
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, intervalTime);
        });
    });
    
    const slideshow = document.querySelector('.about__slideshow');
    if (slideshow) {
        slideshow.addEventListener('mouseenter', () => clearInterval(slideInterval));
        slideshow.addEventListener('mouseleave', () => {
            slideInterval = setInterval(nextSlide, intervalTime);
        });
    }
}

// Inicializar slideshow cuando carga la página
initAboutSlideshow();
