// ===== CROWFORZA - JavaScript Principal =====

const LS_KEYS = {
    theme: 'theme',
    cart: 'crowforza_cart',
    user: 'crowforza_user'
};

const SUPABASE_URL = window.SUPABASE_URL || 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';

let supabaseClient = null;
let currentFilter = 'all';
let currentSort = 'featured';
let displayedProducts = 8;
let cart = [];
let currentUser = null;
let isLoginMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initNavigation();
    initSearch();
    initCatalog();
    initFilters();
    initModal();
    initCartDrawer();
    initAuthModal();
    initNavUserMenu();
    initOrdersModal();
    initCheckoutModal();
    initScrollEffects();
    initForms();
    initAnimations();
    initVideoFallback();
    initAboutSlideshow();

    loadCartFromStorage();
    await initSupabase();
    updateUserIndicator();
});

// ========== SUPABASE ==========
async function initSupabase() {
    if (!window.supabase || SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU_SUPABASE')) {
        showToast('Supabase no configurado: funcionando en modo local.', 'info');
        currentUser = getLocalUser();
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
            throw error;
        }
        currentUser = data?.user || getLocalUser();
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        showToast('No se pudo conectar al backend. Modo local activo.', 'error');
        currentUser = getLocalUser();
    }
}

// ========== TEMA CLARO/OSCURO ==========
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const savedTheme = localStorage.getItem(LS_KEYS.theme);
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
        localStorage.setItem(LS_KEYS.theme, newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeIcon.classList.toggle('fa-moon', theme !== 'dark');
        themeIcon.classList.toggle('fa-sun', theme === 'dark');
    }
}

// ========== NAVEGACIÓN MÓVIL ==========
function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    navToggle.addEventListener('click', () => {
        navMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    navClose.addEventListener('click', closeMenu);

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            closeMenu();
            navLinks.forEach((node) => node.classList.remove('active'));
            link.classList.add('active');
        });
    });

    document.addEventListener('click', (event) => {
        if (navMenu.classList.contains('active') && !navMenu.contains(event.target) && !navToggle.contains(event.target)) {
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

    searchInput.addEventListener('input', (event) => {
        const query = event.target.value.trim();
        searchClear.style.display = query.length > 0 ? 'block' : 'none';

        clearTimeout(searchTimeout);
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => performSearch(query), 250);
        } else {
            hideSearchResults();
        }
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        hideSearchResults();
        searchInput.focus();
    });

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            performSearch(query);
            scrollToCatalog();
        }
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                performSearch(query);
                scrollToCatalog();
                hideSearchResults();
            }
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchResults.contains(event.target) && !searchInput.contains(event.target)) {
            hideSearchResults();
        }
    });

    function performSearch(query) {
        const searchTerms = query.toLowerCase().split(' ');
        const results = products
            .filter((product) => {
                const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
                return searchTerms.every((term) => text.includes(term));
            })
            .slice(0, 6);

        if (!results.length) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No se encontraron resultados para "${query}"</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = results
                .map(
                    (product) => `
                    <div class="search-result-item" data-id="${product.id}">
                        <img src="${product.image}" alt="${product.name}" class="search-result-image">
                        <div class="search-result-info">
                            <h4>${highlightMatch(product.name, query)}</h4>
                            <span class="category">${capitalize(product.category)}</span>
                            <span class="price">$${product.price.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                `
                )
                .join('');

            document.querySelectorAll('.search-result-item').forEach((item) => {
                item.addEventListener('click', () => {
                    openProductModal(Number(item.dataset.id));
                    hideSearchResults();
                });
            });
        }

        searchResults.classList.add('active');
    }

    function highlightMatch(text, query) {
        return text.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
    }

    function hideSearchResults() {
        searchResults.classList.remove('active');
    }

    function scrollToCatalog() {
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========== CATÁLOGO ==========
function initCatalog() {
    renderProducts();
    initLoadMore();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    let filteredProducts = filterProducts();
    filteredProducts = sortProducts(filteredProducts);
    const productsToShow = filteredProducts.slice(0, displayedProducts);

    grid.innerHTML = productsToShow.map((product) => createProductCard(product)).join('');

    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = filteredProducts.length > displayedProducts ? 'inline-flex' : 'none';
    }

    initProductCardEvents();
}

function filterProducts() {
    if (currentFilter === 'all') return [...products];
    return products.filter((product) => product.category === currentFilter);
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
        default:
            sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return sorted;
}

function createProductCard(product) {
    const badgeHTML = product.badge ? `<span class="product-card__badge ${product.badge}">${getBadgeText(product.badge)}</span>` : '';
    const oldPriceHTML = product.oldPrice ? `<span class="product-card__price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : '';

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
                        <i class="fa-regular fa-eye"></i>Ver
                    </button>
                    <button class="product-card__action primary" data-action="add-cart">
                        <i class="fa-solid fa-cart-plus"></i>Añadir
                    </button>
                </div>
            </div>
            <div class="product-card__content">
                <span class="product-card__category">${capitalize(product.category)}</span>
                <h3 class="product-card__title">${product.name}</h3>
                <div class="product-card__rating">
                    <div class="product-card__stars">${generateStars(product.rating)}</div>
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
    return { new: 'Nuevo', sale: 'Oferta', hot: 'Popular' }[badge] || badge;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - Number(hasHalfStar);
    return `${'<i class="fa-solid fa-star"></i>'.repeat(fullStars)}${hasHalfStar ? '<i class="fa-solid fa-star-half-stroke"></i>' : ''}${'<i class="fa-regular fa-star"></i>'.repeat(emptyStars)}`;
}

function initProductCardEvents() {
    document.querySelectorAll('.product-card__wishlist').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            icon.classList.toggle('fa-regular');
            icon.classList.toggle('fa-solid');
            showToast(btn.classList.contains('active') ? 'Añadido a favoritos' : 'Eliminado de favoritos', 'info');
        });
    });

    document.querySelectorAll('.product-card__action').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const productId = Number(btn.closest('.product-card').dataset.id);
            if (btn.dataset.action === 'quick-view') {
                openProductModal(productId);
            } else {
                addToCart(productId);
            }
        });
    });

    document.querySelectorAll('.product-card').forEach((card) => {
        card.addEventListener('click', () => openProductModal(Number(card.dataset.id)));
    });
}

function initLoadMore() {
    const loadMoreBtn = document.getElementById('load-more');
    if (!loadMoreBtn) return;
    loadMoreBtn.addEventListener('click', () => {
        displayedProducts += 8;
        renderProducts();
    });
}

// ========== FILTROS ==========
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((node) => node.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayedProducts = 8;
            renderProducts();
        });
    });

    const sortSelect = document.getElementById('sort-select');
    sortSelect?.addEventListener('change', (event) => {
        currentSort = event.target.value;
        renderProducts();
    });

    document.querySelectorAll('.category-card').forEach((card) => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentFilter = category;
            displayedProducts = 8;
            filterBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === category));
            renderProducts();
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ========== MODAL PRODUCTO ==========
function initModal() {
    const modal = document.getElementById('product-modal');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = modal.querySelector('.modal__overlay');

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
}

function openProductModal(productId) {
    const product = products.find((node) => node.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');
    const oldPriceHTML = product.oldPrice ? `<span class="modal__price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : '';

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
                <button class="btn btn--primary" data-action="add-cart">
                    <i class="fa-solid fa-cart-plus"></i>Añadir al carrito
                </button>
                <button class="btn btn--outline" data-action="wishlist">
                    <i class="fa-regular fa-heart"></i>
                </button>
            </div>
        </div>
    `;

    const minusBtn = modalBody.querySelector('.quantity-btn.minus');
    const plusBtn = modalBody.querySelector('.quantity-btn.plus');
    const quantityInput = modalBody.querySelector('.quantity-input');
    const addBtn = modalBody.querySelector('[data-action="add-cart"]');
    const wishlistBtn = modalBody.querySelector('[data-action="wishlist"]');

    minusBtn.addEventListener('click', () => {
        quantityInput.value = String(Math.max(1, Number(quantityInput.value) - 1));
    });
    plusBtn.addEventListener('click', () => {
        quantityInput.value = String(Math.min(10, Number(quantityInput.value) + 1));
    });
    addBtn.addEventListener('click', () => {
        addToCart(productId, Number(quantityInput.value));
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });
    wishlistBtn.addEventListener('click', () => {
        wishlistBtn.classList.toggle('active');
        const icon = wishlistBtn.querySelector('i');
        icon.classList.toggle('fa-regular');
        icon.classList.toggle('fa-solid');
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ========== CARRITO ==========
function initCartDrawer() {
    const cartBtn = document.getElementById('cart-btn');
    const cartClose = document.getElementById('cart-close');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    cartBtn.addEventListener('click', openCartDrawer);
    cartClose.addEventListener('click', closeCartDrawer);
    drawerOverlay.addEventListener('click', closeCartDrawer);
    checkoutBtn.addEventListener('click', startCheckoutFlow);
}

function openCartDrawer() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('drawer-overlay').classList.add('active');
}

function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('drawer-overlay').classList.remove('active');
}

function addToCart(productId, quantity = 1) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const existing = cart.find((item) => item.id === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity
        });
    }

    saveCartToStorage();
    renderCart();
    showToast(`${product.name} añadido al carrito`, 'success');
}

function updateCartItemQuantity(productId, delta) {
    const item = cart.find((node) => node.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter((node) => node.id !== productId);
    }
    saveCartToStorage();
    renderCart();
}

function removeCartItem(productId) {
    cart = cart.filter((node) => node.id !== productId);
    saveCartToStorage();
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalNode = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (!cart.length) {
        cartItemsContainer.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
        cartTotalNode.textContent = '$0';
        checkoutBtn.disabled = true;
        updateCartCount();
        return;
    }

    cartItemsContainer.innerHTML = cart
        .map(
            (item) => `
            <article class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <h4>${item.name}</h4>
                    <p class="cart-item__price">$${item.price.toLocaleString('es-AR')}</p>
                    <div class="cart-item__controls">
                        <button data-action="minus" data-id="${item.id}" aria-label="Restar unidad">-</button>
                        <span>${item.quantity}</span>
                        <button data-action="plus" data-id="${item.id}" aria-label="Sumar unidad">+</button>
                    </div>
                </div>
                <button class="cart-item__remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </article>
        `
        )
        .join('');

    cartItemsContainer.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const productId = Number(btn.dataset.id);
            const action = btn.dataset.action;
            if (action === 'minus') updateCartItemQuantity(productId, -1);
            if (action === 'plus') updateCartItemQuantity(productId, 1);
            if (action === 'remove') removeCartItem(productId);
        });
    });

    const total = calculateCartTotal();
    cartTotalNode.textContent = `$${total.toLocaleString('es-AR')}`;
    checkoutBtn.disabled = false;
    updateCartCount();
}

function calculateCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    cartCount.textContent = count;
}

function saveCartToStorage() {
    localStorage.setItem(LS_KEYS.cart, JSON.stringify(cart));
}

function loadCartFromStorage() {
    cart = JSON.parse(localStorage.getItem(LS_KEYS.cart) || '[]');
    renderCart();
}

// ========== AUTH ==========
function setAuthModeState(loginMode) {
    isLoginMode = loginMode;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    const title = modal.querySelector('.auth-panel__title');
    const subtitle = modal.querySelector('.auth-panel__subtitle');
    const switchBtn = document.getElementById('auth-switch-btn');
    const submitBtn = document.querySelector('#auth-form button[type="submit"]');
    if (!title || !subtitle || !switchBtn || !submitBtn) return;

    title.textContent = loginMode ? 'Iniciar sesión' : 'Crear cuenta';
    subtitle.textContent = loginMode
        ? 'Ingresa con tu email para continuar con tus compras.'
        : 'Regístrate con email para completar tus compras.';
    submitBtn.innerHTML = loginMode
        ? '<i class="fa-solid fa-right-to-bracket"></i> Ingresar'
        : '<i class="fa-solid fa-user-plus"></i> Registrarme';
    switchBtn.textContent = loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
}

function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-close');
    const overlay = modal.querySelector('.modal__overlay');
    const form = document.getElementById('auth-form');
    const switchBtn = document.getElementById('auth-switch-btn');
    const submitBtn = form.querySelector('button[type="submit"]');

    closeBtn.addEventListener('click', closeAuthModal);
    overlay.addEventListener('click', closeAuthModal);

    switchBtn.addEventListener('click', () => {
        setAuthModeState(!isLoginMode);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('auth-email').value.trim().toLowerCase();
        const password = document.getElementById('auth-password').value.trim();

        if (!validateEmail(email)) {
            showToast('Ingresa un correo válido.', 'error');
            return;
        }
        if (!validateMediumPassword(password)) {
            showToast('Contraseña inválida: mínimo 8 caracteres con letras y números.', 'error');
            return;
        }

        submitBtn.disabled = true;
        const previousText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            if (isLoginMode) {
                await signInUser(email, password);
            } else {
                await registerUser(email, password);
            }
            closeAuthModal();
            updateUserIndicator();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'No se pudo completar la autenticación.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = previousText;
        }
    });

    setAuthModeState(false);
}

function closeUserMenu() {
    const menu = document.getElementById('nav-user-menu');
    const btn = document.getElementById('auth-btn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openUserMenu() {
    const menu = document.getElementById('nav-user-menu');
    const btn = document.getElementById('auth-btn');
    if (menu) menu.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
}

function initNavUserMenu() {
    const navUser = document.getElementById('nav-user');
    const authBtn = document.getElementById('auth-btn');
    const menu = document.getElementById('nav-user-menu');
    const ordersBtn = document.getElementById('nav-user-orders');
    const logoutBtn = document.getElementById('nav-user-logout');
    const accountLink = menu?.querySelector('.nav-user__link');

    authBtn?.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!currentUser) {
            closeUserMenu();
            setAuthModeState(true);
            openAuthModal();
            return;
        }
        const expanded = authBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) closeUserMenu();
        else openUserMenu();
    });

    document.addEventListener('click', (event) => {
        if (navUser && !navUser.contains(event.target)) {
            closeUserMenu();
        }
    });

    accountLink?.addEventListener('click', () => {
        closeUserMenu();
    });

    ordersBtn?.addEventListener('click', () => {
        closeUserMenu();
        openOrdersModal();
    });

    logoutBtn?.addEventListener('click', async () => {
        closeUserMenu();
        try {
            await signOutUser();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'No se pudo cerrar sesión.', 'error');
        }
        updateUserIndicator();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeUserMenu();
    });
}

function initOrdersModal() {
    const modal = document.getElementById('orders-modal');
    const closeBtn = document.getElementById('orders-close');
    const overlay = modal?.querySelector('.modal__overlay');
    if (!modal || !closeBtn || !overlay) return;

    const closeOrdersModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeOrdersModal);
    overlay.addEventListener('click', closeOrdersModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) {
            closeOrdersModal();
        }
    });
}

function openOrdersModal() {
    const modal = document.getElementById('orders-modal');
    const list = document.getElementById('orders-list');
    if (!modal || !list) return;

    const orders = JSON.parse(localStorage.getItem('crowforza_orders') || '[]');
    if (!orders.length) {
        list.innerHTML = '<p class="orders-empty">Aún no tenés pedidos confirmados en este dispositivo.</p>';
    } else {
        list.innerHTML = [...orders]
            .reverse()
            .map((order, index) => {
                const date = order.created_at ? new Date(order.created_at).toLocaleString('es-AR') : '—';
                const total = Number(order.total_amount || 0).toLocaleString('es-AR');
                return `
                    <article class="order-card">
                        <div class="order-card__head">
                            <strong>Pedido #${orders.length - index}</strong>
                            <span class="order-card__date">${date}</span>
                        </div>
                        <p class="order-card__meta">${order.payment_method || '—'} · $${total}</p>
                    </article>
                `;
            })
            .join('');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openAuthModal() {
    closeUserMenu();
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

async function registerUser(email, password) {
    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Cuenta creada. Revisa tu correo para confirmar el registro.', 'success');
        return;
    }
    currentUser = { email, id: cryptoRandomId() };
    localStorage.setItem(LS_KEYS.user, JSON.stringify({ ...currentUser, password }));
    showToast('Cuenta creada en modo local.', 'success');
}

async function signInUser(email, password) {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        showToast('Sesión iniciada correctamente.', 'success');
        return;
    }

    const localUser = JSON.parse(localStorage.getItem(LS_KEYS.user) || 'null');
    if (!localUser || localUser.email !== email || localUser.password !== password) {
        throw new Error('Credenciales incorrectas en modo local.');
    }
    currentUser = { id: localUser.id, email: localUser.email };
    showToast('Sesión iniciada en modo local.', 'success');
}

async function signOutUser() {
    if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    }
    currentUser = null;
    showToast('Sesión cerrada correctamente.', 'info');
}

function getLocalUser() {
    const localUser = JSON.parse(localStorage.getItem(LS_KEYS.user) || 'null');
    if (!localUser) return null;
    return { id: localUser.id, email: localUser.email };
}

function updateUserIndicator() {
    const cartBtn = document.getElementById('cart-btn');
    const authBtnText = document.getElementById('auth-btn-text');
    const authBtn = document.getElementById('auth-btn');
    const navUser = document.getElementById('nav-user');
    if (!cartBtn) return;
    cartBtn.title = currentUser ? `Sesión iniciada: ${currentUser.email}` : 'Carrito (sin sesión)';
    navUser?.classList.toggle('nav-user--logged', Boolean(currentUser));
    if (authBtnText && authBtn) {
        authBtnText.textContent = currentUser ? 'Cuenta' : 'Ingresar';
        authBtn.title = currentUser
            ? `Menú de cuenta (${currentUser.email})`
            : 'Iniciar sesión o registrarse';
    }
}

// ========== CHECKOUT ==========
function initCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const closeBtn = document.getElementById('checkout-close');
    const overlay = modal.querySelector('.modal__overlay');
    const form = document.getElementById('checkout-form');

    closeBtn.addEventListener('click', closeCheckoutModal);
    overlay.addEventListener('click', closeCheckoutModal);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!cart.length) {
            showToast('No hay productos en el carrito.', 'error');
            return;
        }

        const payload = {
            customer_name: document.getElementById('checkout-name').value.trim(),
            payment_method: document.getElementById('checkout-method').value,
            payment_notes: document.getElementById('checkout-notes').value.trim(),
            total_amount: calculateCartTotal(),
            items: cart.map((item) => ({
                product_id: item.id,
                product_name: item.name,
                unit_price: item.price,
                quantity: item.quantity
            })),
            customer_email: currentUser?.email || null,
            customer_id: currentUser?.id || null,
            created_at: new Date().toISOString(),
            status: 'paid'
        };

        try {
            await persistOrder(payload);
            showToast('Pago confirmado. ¡Gracias por tu compra!', 'success');
            cart = [];
            saveCartToStorage();
            renderCart();
            closeCheckoutModal();
            closeCartDrawer();
            form.reset();
        } catch (error) {
            console.error(error);
            showToast('No se pudo registrar el pago.', 'error');
        }
    });
}

function startCheckoutFlow() {
    if (!cart.length) {
        showToast('El carrito está vacío.', 'error');
        return;
    }
    if (!currentUser) {
        showToast('Debes iniciar sesión para pagar.', 'info');
        setAuthModeState(true);
        openAuthModal();
        return;
    }
    document.getElementById('checkout-total').textContent = `$${calculateCartTotal().toLocaleString('es-AR')}`;
    document.getElementById('checkout-modal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('active');
}

async function persistOrder(orderPayload) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('orders').insert({
            customer_email: orderPayload.customer_email,
            customer_name: orderPayload.customer_name,
            payment_method: orderPayload.payment_method,
            payment_notes: orderPayload.payment_notes,
            total_amount: orderPayload.total_amount,
            status: orderPayload.status,
            items: orderPayload.items
        });
        if (error) throw error;
        return;
    }
    const localOrders = JSON.parse(localStorage.getItem('crowforza_orders') || '[]');
    localOrders.push(orderPayload);
    localStorage.setItem('crowforza_orders', JSON.stringify(localOrders));
}

// ========== EFECTOS DE SCROLL ==========
function initScrollEffects() {
    const header = document.getElementById('header');
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        header.classList.toggle('scrolled', currentScroll > 50);
        backToTop.classList.toggle('visible', currentScroll > 500);
    });

    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach((section) => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + section.offsetHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${current}`));
    });
}

// ========== FORMULARIOS ==========
function initForms() {
    const contactForm = document.getElementById('contact-form');
    contactForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        showToast('Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
        contactForm.reset();
    });

    const newsletterForm = document.getElementById('newsletter-form');
    newsletterForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = newsletterForm.querySelector('input').value;
        if (validateEmail(email)) {
            showToast('¡Gracias por suscribirte!', 'success');
            newsletterForm.reset();
        } else {
            showToast('Email inválido.', 'error');
        }
    });

    document.querySelectorAll('.footer__form').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = form.querySelector('input').value;
            if (validateEmail(email)) {
                showToast('Suscripción exitosa.', 'success');
                form.reset();
            } else {
                showToast('Email inválido.', 'error');
            }
        });
    });
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateMediumPassword(password) {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
}

// ========== ANIMACIONES ==========
function initAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );

    document
        .querySelectorAll('.feature-card, .category-card, .product-card, .testimonial-card, .about__content, .about__images')
        .forEach((element) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });

    const style = document.createElement('style');
    style.textContent = '.animated{opacity:1!important;transform:translateY(0)!important;}';
    document.head.appendChild(style);
}

// ========== TOAST ==========
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast__icon"><i class="fa-solid ${icons[type] || icons.info}"></i></div>
        <span class="toast__message">${message}</span>
        <button class="toast__close"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(toast);

    toast.querySelector('.toast__close').addEventListener('click', () => removeToast(toast));
    setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
}

// ========== VIDEO FALLBACK ==========
function initVideoFallback() {
    const video = document.getElementById('hero-video');
    const fallbackBg = document.querySelector('.hero__fallback-bg');
    if (!video) return;

    video.addEventListener('error', () => {
        video.style.display = 'none';
        if (fallbackBg) fallbackBg.style.zIndex = '0';
    });

    video.play().catch(() => {
        video.style.display = 'none';
        if (fallbackBg) fallbackBg.style.zIndex = '0';
    });
}

// ========== ABOUT SLIDESHOW ==========
function initAboutSlideshow() {
    const slideshow = document.getElementById('about-slideshow');
    const indicatorsContainer = document.getElementById('about-indicators');
    if (!slideshow || !indicatorsContainer) return;

    const aboutMedia = [
        { src: 'assets/videos/1amoladora2.mp4', label: 'Operario con amoladora' },
        { src: 'assets/videos/2demoledor.mp4', label: 'Demoledor industrial en uso' },
        { src: 'assets/videos/3soldador.mp4', label: 'Trabajo profesional de soldadura' },
        { src: 'assets/videos/4amoladora.mp4', label: 'Amoladora en operación' }
    ];

    // Tiempo visible por slide (ms): 6 segundos para todos.
    const durationsMs = [6000, 6000, 6000, 6000];

    slideshow.innerHTML = aboutMedia
        .map(
            (media, index) => `
            <div class="about__slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
                <video loop muted playsinline preload="metadata" aria-label="${media.label}">
                    <source src="${media.src}" type="video/mp4">
                    Tu navegador no soporta videos HTML5.
                </video>
            </div>
        `
        )
        .join('');

    indicatorsContainer.innerHTML = aboutMedia
        .map(
            (_, index) => `
            <span class="about__indicator ${index === 0 ? 'active' : ''}" data-slide="${index}" aria-label="Ir al video ${index + 1}"></span>
        `
        )
        .join('');

    const slides = slideshow.querySelectorAll('.about__slide');
    const indicators = indicatorsContainer.querySelectorAll('.about__indicator');
    const videos = Array.from(slides).map((slide) => slide.querySelector('video'));
    if (!slides.length) return;

    let currentSlide = 0;
    let slideTimeoutId = null;

    const syncVideosForSlide = (activeIndex) => {
        videos.forEach((video, i) => {
            if (!video) return;
            if (i === activeIndex) {
                try {
                    video.currentTime = 0;
                } catch {
                    /* ignore */
                }
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    };

    const showSlide = (index) => {
        currentSlide = index;
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        indicators.forEach((indicator, i) => indicator.classList.toggle('active', i === index));
        syncVideosForSlide(index);
    };

    const clearSchedule = () => {
        if (slideTimeoutId) {
            clearTimeout(slideTimeoutId);
            slideTimeoutId = null;
        }
    };

    const scheduleNext = () => {
        clearSchedule();
        const wait = durationsMs[currentSlide] ?? 6000;
        slideTimeoutId = setTimeout(() => {
            const next = (currentSlide + 1) % slides.length;
            showSlide(next);
            scheduleNext();
        }, wait);
    };

    showSlide(0);
    scheduleNext();

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
            clearSchedule();
            scheduleNext();
        });
    });

    slideshow.addEventListener('mouseenter', () => clearSchedule());
    slideshow.addEventListener('mouseleave', () => scheduleNext());
}

// ========== UTILIDADES ==========
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function cryptoRandomId() {
    return Math.random().toString(36).slice(2, 11);
}
