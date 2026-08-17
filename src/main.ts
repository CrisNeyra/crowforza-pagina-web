// @ts-nocheck — migración gradual: la lógica legacy convive con módulos tipados.
// ===== CROWFORZA - Aplicación principal =====
import { createClient } from "@supabase/supabase-js";
import { LS_KEYS } from "./constants";
import {
    enableMercadoPago,
    isSupabaseConfigured,
    supabaseAnonKey,
    supabaseUrl,
} from "./config";
import { products as fallbackProducts } from "./data/products";
import { categories as fallbackCategories } from "./data/products";
import { countProductsByCategory, describeStockChange, mapDbProduct, quoteCartAgainstCatalog } from "./lib/catalog";
import {
    addToCartState,
    calculateCartCount,
    calculateCartTotal,
    removeCartItemState,
    updateCartItemQuantityState,
} from "./lib/cart";
import { capitalize, generateStars, getBadgeText } from "./lib/format";
import { submitPublicForm } from "./lib/forms";
import { createMercadoPagoCheckout } from "./lib/payments";
import { checkRateLimit, getClientFingerprint } from "./lib/rateLimit";
import {
    cryptoRandomId,
    escapeHtml,
    hashLocalPassword,
    highlightMatch,
} from "./lib/security";
import { showToast } from "./lib/toast";
import { validateEmail, validateMediumPassword } from "./lib/validation";

let supabaseClient = null;
let currentFilter = 'all';
let currentSort = 'featured';
let displayedProducts = 8;
/** @type {CartItem[]} */
let cart = [];
let currentUser = null;
let isLoginMode = false;
/** @type {import("./types/product").Product[]} */
let catalogProducts = fallbackProducts.map((product) => ({ ...product }));
let catalogCategories = fallbackCategories.map((category) => ({
    ...category,
    count: countProductsByCategory(fallbackProducts, category.id),
    image: `/assets/categories/${category.id}.webp`,
}));
let isAdminUser = false;

document.addEventListener('DOMContentLoaded', async () => {
    forceLightTheme();
    initNavigation();
    initSearch();
    initCatalog();
    initFilters();
    renderCategories();
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
    initCookieBanner();
    initInventoryModal();

    loadCartFromStorage();
    await initSupabase();
    await loadCatalogFromSupabase();
    await loadCategoriesFromSupabase();
    await refreshAdminStatus();
    renderCategories();
    renderProducts();
    updateUserIndicator();
    notifyPaymentReturn();
});

function notifyPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;
    if (payment === 'success') {
        showToast('Pago recibido. Confirmaremos el pedido cuando Mercado Pago lo valide.', 'success');
    } else if (payment === 'failure') {
        showToast('El pago no se completó. Podés intentar de nuevo.', 'error');
    } else if (payment === 'pending') {
        showToast('Pago pendiente de acreditación.', 'info');
    }
    params.delete('payment');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
}

// ========== SUPABASE ==========
async function initSupabase() {
    if (!isSupabaseConfigured()) {
        showToast('Supabase no configurado: funcionando en modo local.', 'info');
        currentUser = getLocalUser();
        return;
    }

    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        // getUser() sin sesión lanza error y no significa que el backend esté caído.
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            throw error;
        }
        currentUser = data?.session?.user || null;
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session?.user || null;
            refreshAdminStatus().then(() => updateUserIndicator());
        });
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        supabaseClient = null;
        showToast('No se pudo conectar al backend. Modo local activo.', 'error');
        currentUser = getLocalUser();
    }
}

async function loadCatalogFromSupabase() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
        .from('products')
        .select('id, name, category, price, old_price, image, rating, reviews, badge, description, stock, featured, active')
        .eq('active', true)
        .order('id', { ascending: true });
    if (error || !data?.length) {
        if (error) console.warn('Catálogo DB no disponible, se usa el local.', error.message);
        return;
    }
    catalogProducts = data.map((row) => mapDbProduct(row));
    catalogCategories = catalogCategories.map((category) => ({
        ...category,
        count: countProductsByCategory(catalogProducts, category.id),
    }));
}

async function loadCategoriesFromSupabase() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient
        .from('categories')
        .select('id, name, icon, image, sort_order')
        .order('sort_order', { ascending: true });
    if (error || !data?.length) {
        if (error) console.warn('Categorías DB no disponibles, se usa el local.', error.message);
        catalogCategories = catalogCategories.map((category) => ({
            ...category,
            count: countProductsByCategory(catalogProducts, category.id),
        }));
        return;
    }
    catalogCategories = data.map((row) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        image: row.image,
        count: countProductsByCategory(catalogProducts, row.id),
    }));
}

function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;
    grid.innerHTML = catalogCategories
        .map(
            (category) => `
        <div class="category-card" data-category="${escapeHtml(category.id)}">
            <div class="category-card__image">
                <img src="${escapeHtml(category.image || `/assets/categories/${category.id}.webp`)}" alt="${escapeHtml(category.name)}" loading="lazy" decoding="async" width="400" height="300">
                <div class="category-card__overlay"></div>
            </div>
            <div class="category-card__content">
                <i class="fa-solid ${escapeHtml(category.icon)}"></i>
                <h3>${escapeHtml(category.name)}</h3>
                <span>${category.count} producto${category.count === 1 ? '' : 's'}</span>
            </div>
        </div>`
        )
        .join('');
}

async function refreshAdminStatus() {
    isAdminUser = false;
    if (!supabaseClient || !currentUser) return;
    const { data, error } = await supabaseClient.from('admins').select('user_id').eq('user_id', currentUser.id).maybeSingle();
    if (error) {
        console.warn('No se pudo verificar admin:', error.message);
        return;
    }
    isAdminUser = Boolean(data?.user_id);
}

function initInventoryModal() {
    const modal = document.getElementById('inventory-modal');
    const closeBtn = document.getElementById('inventory-close');
    const overlay = modal?.querySelector('.modal__overlay');
    const saveBtn = document.getElementById('inventory-save');
    if (!modal || !closeBtn || !overlay) return;

    const close = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    saveBtn?.addEventListener('click', saveInventoryEdits);
}

async function openInventoryModal() {
    const modal = document.getElementById('inventory-modal');
    const list = document.getElementById('inventory-list');
    if (!modal || !list) return;
    if (!isAdminUser) {
        showToast('No tenés permiso de inventario.', 'error');
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    list.innerHTML = '<p class="orders-empty">Cargando inventario…</p>';
    const { data, error } = await supabaseClient
        .from('products')
        .select('id, name, price, stock, active')
        .order('id', { ascending: true });
    if (error || !data) {
        list.innerHTML = '<p class="orders-empty">No se pudo cargar el inventario.</p>';
        return;
    }
    list.innerHTML = data
        .map(
            (row) => `
        <div class="inventory-row" data-id="${row.id}" data-name="${escapeHtml(row.name)}" data-stock="${Number(row.stock)}">
            <span class="inventory-row__name">${escapeHtml(row.name)}</span>
            <label>Precio
                <input type="number" min="0" step="1" class="inventory-price" value="${Number(row.price)}">
            </label>
            <label>Stock
                <input type="number" min="0" step="1" class="inventory-stock" value="${Number(row.stock)}">
            </label>
        </div>`
        )
        .join('');
}

async function saveInventoryEdits() {
    const rows = document.querySelectorAll('#inventory-list .inventory-row');
    if (!rows.length || !supabaseClient) return;
    try {
        const diffs = [];
        for (const row of rows) {
            const id = Number(row.dataset.id);
            const name = row.dataset.name || `Producto ${id}`;
            const oldStock = Number(row.dataset.stock);
            const price = Number(row.querySelector('.inventory-price')?.value);
            const stock = Number(row.querySelector('.inventory-stock')?.value);
            if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
                throw new Error('Precio o stock inválido');
            }
            const { data, error } = await supabaseClient.rpc('admin_set_product', {
                p_id: id,
                p_price: price,
                p_stock: stock,
            });
            if (error) throw error;
            if (Number.isFinite(oldStock) && oldStock !== stock) {
                diffs.push(describeStockChange(data?.name || name, data?.old_stock ?? oldStock, data?.new_stock ?? stock));
            }
        }
        await loadCatalogFromSupabase();
        await loadCategoriesFromSupabase();
        renderCategories();
        renderProducts();
        showToast(diffs.length ? diffs.join(' · ') : 'Inventario actualizado.', 'success');
        document.getElementById('inventory-modal')?.classList.remove('active');
        document.body.style.overflow = '';
    } catch (error) {
        showToast(error instanceof Error ? error.message : 'No se pudo guardar.', 'error');
    }
}

// ========== TEMA (solo claro / fondo blanco) ==========
function forceLightTheme() {
    document.documentElement.removeAttribute('data-theme');
    try {
        localStorage.removeItem(LS_KEYS.theme);
    } catch {
        /* ignore */
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
        navToggle.setAttribute('aria-expanded', 'true');
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
        navToggle.setAttribute('aria-expanded', 'false');
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
            const found = performSearch(query);
            if (found) scrollToCatalog();
        }
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                const found = performSearch(query);
                if (found) scrollToCatalog();
                hideSearchResults();
            }
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
            return;
        }
        event.preventDefault();
        searchInput.focus();
    });

    document.addEventListener('click', (event) => {
        if (!searchResults.contains(event.target) && !searchInput.contains(event.target)) {
            hideSearchResults();
        }
    });

    function performSearch(query) {
        const searchTerms = query.toLowerCase().split(' ');
        const results = catalogProducts
            .filter((product) => {
                const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
                return searchTerms.every((term) => text.includes(term));
            })
            .slice(0, 6);

        if (!results.length) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fa-solid fa-search"></i>
                    <p>No se encontraron resultados para "<span data-query></span>"</p>
                    <a href="#catalog" class="btn btn--outline" data-catalog-cta>Ver catálogo</a>
                </div>
            `;
            const queryNode = searchResults.querySelector('[data-query]');
            if (queryNode) queryNode.textContent = query;
            searchResults.querySelector('[data-catalog-cta]')?.addEventListener('click', (event) => {
                event.preventDefault();
                hideSearchResults();
                currentFilter = 'all';
                displayedProducts = 8;
                document.querySelectorAll('.filter-btn').forEach((btn) => {
                    btn.classList.toggle('active', btn.dataset.filter === 'all');
                });
                renderProducts();
                scrollToCatalog();
            });
            searchResults.classList.add('active');
            return false;
        }
            searchResults.innerHTML = results
                .map(
                    (product) => `
                    <div class="search-result-item" data-id="${Number(product.id)}">
                        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="search-result-image" loading="lazy" decoding="async" width="48" height="48">
                        <div class="search-result-info">
                            <h4>${highlightMatch(product.name, query)}</h4>
                            <span class="category">${escapeHtml(capitalize(product.category))}</span>
                            <span class="price">$${Number(product.price).toLocaleString('es-AR')}</span>
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

        searchResults.classList.add('active');
        return true;
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

    if (!filteredProducts.length) {
        grid.innerHTML = `
            <div class="catalog-empty">
                <p>No hay productos para este filtro.</p>
                <button type="button" class="btn btn--primary" id="catalog-empty-reset">Ver todos</button>
            </div>`;
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        document.getElementById('catalog-empty-reset')?.addEventListener('click', () => {
            currentFilter = 'all';
            displayedProducts = 8;
            document.querySelectorAll('.filter-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.filter === 'all');
            });
            renderProducts();
        });
        return;
    }

    grid.innerHTML = productsToShow.map((product) => createProductCard(product)).join('');

    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = filteredProducts.length > displayedProducts ? 'inline-flex' : 'none';
    }

    initProductCardEvents();
}

function filterProducts() {
    if (currentFilter === 'all') return [...catalogProducts];
    return catalogProducts.filter((product) => product.category === currentFilter);
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
    const safeName = escapeHtml(product.name);
    const safeImage = escapeHtml(product.image);
    const safeCategory = escapeHtml(capitalize(product.category));

    const outOfStock = !product.inStock || (product.stock ?? 0) <= 0;
    const stockHint = outOfStock
        ? '<p class="product-card__stock product-card__stock--out">Sin stock</p>'
        : `<p class="product-card__stock">${product.stock ?? ""} u.</p>`;
    const overlay = outOfStock ? '<div class="product-card__oos-overlay">Sin stock</div>' : '';
    const addButton = outOfStock
        ? `<button class="product-card__action primary" data-action="add-cart" disabled><i class="fa-solid fa-ban"></i>Sin stock</button>`
        : `<button class="product-card__action primary" data-action="add-cart"><i class="fa-solid fa-cart-plus"></i>Añadir</button>`;

    return `
        <article class="product-card${outOfStock ? ' product-card--out' : ''}" data-id="${product.id}" data-category="${escapeHtml(product.category)}">
            ${badgeHTML}
            <button class="product-card__wishlist" aria-label="Añadir a favoritos">
                <i class="fa-regular fa-heart"></i>
            </button>
            <div class="product-card__image">
                <img src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" width="400" height="400">
                ${overlay}
                <div class="product-card__actions">
                    <button class="product-card__action" data-action="quick-view">
                        <i class="fa-regular fa-eye"></i>Ver
                    </button>
                    ${addButton}
                </div>
            </div>
            <div class="product-card__content">
                <span class="product-card__category">${safeCategory}</span>
                <h3 class="product-card__title">${safeName}</h3>
                <div class="product-card__rating">
                    <div class="product-card__stars">${generateStars(product.rating)}</div>
                    <span class="product-card__reviews">(${product.reviews})</span>
                </div>
                <div class="product-card__price">
                    <span class="product-card__price-current">$${product.price.toLocaleString('es-AR')}</span>
                    ${oldPriceHTML}
                </div>
                ${stockHint}
            </div>
        </article>
    `;
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
            } else if (btn.dataset.action === 'add-cart' && !btn.disabled) {
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

    const categoriesGrid = document.getElementById('categories-grid');
    categoriesGrid?.addEventListener('click', (event) => {
        const card = event.target.closest('.category-card');
        if (!card) return;
        const category = card.dataset.category;
        currentFilter = category;
        displayedProducts = 8;
        filterBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === category));
        renderProducts();
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
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
    const product = catalogProducts.find((node) => node.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');
    const oldPriceHTML = product.oldPrice ? `<span class="modal__price-old">$${product.oldPrice.toLocaleString('es-AR')}</span>` : '';
    const maxQty = Math.min(10, Math.max(1, Number(product.stock) || 1));
    const outOfStock = !product.inStock || (product.stock ?? 0) <= 0;

    modalBody.innerHTML = `
        <div class="modal__image">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="eager" decoding="async" width="600" height="600">
        </div>
        <div class="modal__info">
            <span class="modal__category">${escapeHtml(capitalize(product.category))}</span>
            <h2 class="modal__title">${escapeHtml(product.name)}</h2>
            <div class="modal__rating">
                <div class="modal__stars">${generateStars(product.rating)}</div>
                <span class="modal__reviews">${product.reviews} valoraciones</span>
            </div>
            <div class="modal__price">
                <span class="modal__price-current">$${product.price.toLocaleString('es-AR')}</span>
                ${oldPriceHTML}
            </div>
            <p class="modal__description">${escapeHtml(product.description)}</p>
            <p class="modal__stock">${outOfStock ? "Sin stock" : `Stock: ${product.stock} u.`}</p>
            <div class="modal__quantity">
                <label>Cantidad:</label>
                <div class="quantity-control">
                    <button class="quantity-btn minus"><i class="fa-solid fa-minus"></i></button>
                    <input type="number" value="1" min="1" max="${maxQty}" class="quantity-input" ${outOfStock ? "disabled" : ""}>
                    <button class="quantity-btn plus"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            <div class="modal__buttons">
                <button class="btn btn--primary" data-action="add-cart" ${outOfStock ? "disabled" : ""}>
                    <i class="fa-solid fa-cart-plus"></i>${outOfStock ? "Sin stock" : "Añadir al carrito"}
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
        quantityInput.value = String(Math.min(maxQty, Number(quantityInput.value) + 1));
    });
    addBtn.addEventListener('click', () => {
        if (outOfStock) return;
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
    const product = catalogProducts.find((item) => item.id === productId);
    if (!product) return;
    if (!product.inStock || (product.stock ?? 0) <= 0) {
        showToast('Este producto no tiene stock.', 'error');
        return;
    }
    const already = cart.find((item) => item.id === productId)?.quantity || 0;
    if (already + quantity > (product.stock ?? 0)) {
        showToast(`Solo hay ${product.stock} u. disponibles.`, 'error');
        return;
    }

    cart = addToCartState(cart, product, quantity);
    saveCartToStorage();
    renderCart();
    showToast(`${product.name} añadido al carrito`, 'success');
}

function updateCartItemQuantity(productId, delta) {
    cart = updateCartItemQuantityState(cart, productId, delta);
    saveCartToStorage();
    renderCart();
}

function removeCartItem(productId) {
    cart = removeCartItemState(cart, productId);
    saveCartToStorage();
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalNode = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (!cart.length) {
        cartItemsContainer.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br><a href="#catalog">Ver catálogo</a></p>';
        cartTotalNode.textContent = '$0';
        checkoutBtn.disabled = true;
        updateCartCount();
        return;
    }

    cartItemsContainer.innerHTML = cart
        .map(
            (item) => `
            <article class="cart-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" width="72" height="72">
                <div>
                    <h4>${escapeHtml(item.name)}</h4>
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

    const total = calculateCartTotal(cart);
    cartTotalNode.textContent = `$${total.toLocaleString('es-AR')}`;
    checkoutBtn.disabled = false;
    updateCartCount();
}

function updateCartCount() {
    const count = calculateCartCount(cart);
    const cartCount = document.getElementById('cart-count');
    cartCount.textContent = String(count);
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

    const inventoryBtn = document.getElementById('nav-user-inventory');
    inventoryBtn?.addEventListener('click', () => {
        closeUserMenu();
        openInventoryModal();
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

async function openOrdersModal() {
    const modal = document.getElementById('orders-modal');
    const list = document.getElementById('orders-list');
    if (!modal || !list) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    list.innerHTML = '<p class="orders-empty">Cargando pedidos…</p>';

    let orders = [];
    try {
        orders = await fetchOrders();
    } catch (error) {
        console.error(error);
        list.innerHTML = '<p class="orders-empty">No se pudieron cargar los pedidos.</p>';
        return;
    }

    renderOrdersList(list, orders);
}

function renderOrdersList(list, orders) {
    if (!orders.length) {
        list.innerHTML = '<p class="orders-empty">Aún no tenés pedidos.</p>';
        return;
    }

    list.innerHTML = [...orders]
        .map((order, index) => {
            const date = order.created_at ? new Date(order.created_at).toLocaleString('es-AR') : '—';
            const total = Number(order.total_amount || 0).toLocaleString('es-AR');
            const status = escapeHtml(order.status || 'pending');
            return `
                <article class="order-card">
                    <div class="order-card__head">
                        <strong>Pedido #${orders.length - index}</strong>
                        <span class="order-card__date">${escapeHtml(date)}</span>
                    </div>
                    <p class="order-card__meta">${escapeHtml(order.payment_method || '—')} · $${total} · ${status}</p>
                </article>
            `;
        })
        .join('');
}

async function fetchOrders() {
    if (supabaseClient && currentUser) {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('created_at, payment_method, total_amount, status')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    const localOrders = JSON.parse(localStorage.getItem('crowforza_orders') || '[]');
    return [...localOrders].reverse();
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
    const passwordHash = await hashLocalPassword(email, password);
    localStorage.setItem(
        LS_KEYS.user,
        JSON.stringify({ id: currentUser.id, email: currentUser.email, passwordHash })
    );
    showToast('Cuenta creada en modo local.', 'success');
}

async function signInUser(email, password) {
    if (supabaseClient) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        await refreshAdminStatus();
        showToast('Sesión iniciada correctamente.', 'success');
        return;
    }

    const localUser = JSON.parse(localStorage.getItem(LS_KEYS.user) || 'null');
    if (!localUser || localUser.email !== email) {
        throw new Error('Credenciales incorrectas en modo local.');
    }

    // Migración: cuentas viejas guardaban la contraseña en texto plano.
    if (localUser.password && !localUser.passwordHash) {
        localStorage.removeItem(LS_KEYS.user);
        throw new Error('Tu cuenta local antigua se invalidó por seguridad. Registrate de nuevo.');
    }

    const passwordHash = await hashLocalPassword(email, password);
    if (localUser.passwordHash !== passwordHash) {
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
    isAdminUser = false;
    showToast('Sesión cerrada correctamente.', 'info');
}

function getLocalUser() {
    const localUser = JSON.parse(localStorage.getItem(LS_KEYS.user) || 'null');
    if (!localUser?.email) return null;

    // Nunca devolver ni persistir contraseñas en texto plano.
    if (localUser.password) {
        const { password, ...safeUser } = localUser;
        if (safeUser.passwordHash) {
            localStorage.setItem(LS_KEYS.user, JSON.stringify(safeUser));
        } else {
            localStorage.removeItem(LS_KEYS.user);
            return null;
        }
    }

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
    const inventoryBtn = document.getElementById('nav-user-inventory');
    if (inventoryBtn) {
        inventoryBtn.hidden = !(currentUser && isAdminUser);
    }
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
        if (!currentUser) {
            showToast('Debes iniciar sesión para pagar.', 'info');
            setAuthModeState(true);
            openAuthModal();
            return;
        }

        const customerName = document.getElementById('checkout-name').value.trim();
        const paymentMethod = document.getElementById('checkout-method').value;
        const paymentNotes = document.getElementById('checkout-notes').value.trim();
        let quoted;
        try {
            quoted = quoteCartAgainstCatalog(cart, catalogProducts);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Hay un producto no disponible.", "error");
            return;
        }
        const items = quoted.items;

        try {
            // MP real solo si el flag está ON y hay sesión (pasarela preparada, no obligatoria en demo).
            if (
                paymentMethod === 'mercado_pago' &&
                enableMercadoPago &&
                supabaseClient &&
                isSupabaseConfigured()
            ) {
                const { data: sessionData } = await supabaseClient.auth.getSession();
                const accessToken = sessionData?.session?.access_token;
                if (!accessToken) {
                    showToast('Sesión expirada. Volvé a iniciar sesión.', 'error');
                    return;
                }

                showToast('Redirigiendo a Mercado Pago...', 'info');
                const checkout = await createMercadoPagoCheckout(accessToken, {
                    customer_name: customerName,
                    payment_notes: paymentNotes || undefined,
                    items
                });
                const redirectUrl = checkout.init_point || checkout.sandbox_init_point;
                if (!redirectUrl) {
                    throw new Error('Mercado Pago no devolvió URL de pago');
                }

                cart = [];
                saveCartToStorage();
                renderCart();
                closeCheckoutModal();
                closeCartDrawer();
                form.reset();
                window.location.href = redirectUrl;
                return;
            }

            // Métodos offline o MP en modo demo: pedido pending (nunca paid desde el browser).
            const payload = {
                customer_name: customerName,
                payment_method: paymentMethod,
                payment_notes: paymentNotes,
                total_amount: quoted.total,
                items,
                customer_email: currentUser?.email || null,
                customer_id: currentUser?.id || null,
                created_at: new Date().toISOString(),
                status: 'pending'
            };

            await persistOrder(payload);
            if (paymentMethod === 'mercado_pago' && !enableMercadoPago) {
                showToast(
                    'Pedido pendiente. Mercado Pago está preparado en código; en esta demo no redirige a la pasarela.',
                    'success'
                );
            } else {
                showToast('Pedido registrado. Queda pendiente de confirmación de pago.', 'success');
            }
            cart = [];
            saveCartToStorage();
            renderCart();
            closeCheckoutModal();
            closeCartDrawer();
            form.reset();
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : 'No se pudo registrar el pedido.', 'error');
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
    try {
        const quoted = quoteCartAgainstCatalog(cart, catalogProducts);
        document.getElementById('checkout-total').textContent = `$${quoted.total.toLocaleString('es-AR')}`;
    } catch (error) {
        showToast(error instanceof Error ? error.message : 'Hay un producto no disponible.', 'error');
        return;
    }
    document.getElementById('checkout-modal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('active');
}

async function persistOrder(orderPayload) {
    if (supabaseClient) {
        const { error } = await supabaseClient.rpc('place_order', {
            p_customer_name: orderPayload.customer_name,
            p_payment_method: orderPayload.payment_method,
            p_payment_notes: orderPayload.payment_notes || null,
            p_items: (orderPayload.items || []).map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
            })),
        });
        if (error) throw error;
        await loadCatalogFromSupabase();
        renderProducts();
        return;
    }
    const localOrders = JSON.parse(localStorage.getItem('crowforza_orders') || '[]');
    localOrders.push({ ...orderPayload, status: 'pending' });
    localStorage.setItem('crowforza_orders', JSON.stringify(localOrders));
    catalogProducts = catalogProducts.map((product) => {
        const line = orderPayload.items?.find((item) => item.product_id === product.id);
        if (!line) return product;
        const nextStock = Math.max(0, (product.stock ?? 0) - Number(line.quantity || 0));
        return { ...product, stock: nextStock, inStock: nextStock > 0 };
    });
    renderProducts();
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
    contactForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const honeypotValue = contactForm.querySelector('input[name="website"]')?.value || '';
        if (honeypotValue.trim()) return;
        if (!checkRateLimit('contact')) {
            showToast('Demasiados envíos seguidos. Espera un momento e intenta otra vez.', 'error');
            return;
        }

        const payload = {
            full_name: contactForm.querySelector('#name')?.value.trim() || '',
            email: contactForm.querySelector('#email')?.value.trim().toLowerCase() || '',
            phone: contactForm.querySelector('#phone')?.value.trim() || null,
            subject: contactForm.querySelector('#subject')?.value || 'consulta',
            message: contactForm.querySelector('#message')?.value.trim() || '',
            source_url: window.location.href,
            client_fingerprint: getClientFingerprint(),
            status: 'new',
            honeypot: honeypotValue
        };

        if (!validateEmail(payload.email)) {
            showToast('Ingresa un email válido para contacto.', 'error');
            return;
        }

        try {
            await persistContactMessage(payload);
            showToast('Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
            contactForm.reset();
        } catch (error) {
            console.error(error);
            showToast('No pudimos registrar tu mensaje. Intenta nuevamente.', 'error');
        }
    });

    const newsletterForm = document.getElementById('newsletter-form');
    newsletterForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = newsletterForm.querySelector('input[type="email"]').value;
        const honeypotValue = newsletterForm.querySelector('input[name="company"]')?.value || '';
        if (honeypotValue.trim()) return;
        if (!checkRateLimit('newsletter')) {
            showToast('Demasiadas suscripciones seguidas. Espera un momento.', 'error');
            return;
        }

        if (validateEmail(email)) {
            try {
                await persistNewsletterSubscription({
                    email: email.trim().toLowerCase(),
                    source: 'newsletter_main',
                    source_url: window.location.href,
                    client_fingerprint: getClientFingerprint(),
                    status: 'active',
                    honeypot: honeypotValue
                });
                showToast('¡Gracias por suscribirte!', 'success');
                newsletterForm.reset();
            } catch (error) {
                console.error(error);
                showToast('No se pudo guardar tu suscripción.', 'error');
            }
        } else {
            showToast('Email inválido.', 'error');
        }
    });

    document.querySelectorAll('.footer__form').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            if (validateEmail(email)) {
                try {
                    await persistNewsletterSubscription({
                        email: email.trim().toLowerCase(),
                        source: 'newsletter_footer',
                        source_url: window.location.href,
                        client_fingerprint: getClientFingerprint(),
                        status: 'active'
                    });
                    showToast('Suscripción exitosa.', 'success');
                    form.reset();
                } catch (error) {
                    console.error(error);
                    showToast('No se pudo registrar la suscripción.', 'error');
                }
            } else {
                showToast('Email inválido.', 'error');
            }
        });
    });
}



async function persistContactMessage(payload) {
    if (isSupabaseConfigured()) {
        try {
            await submitPublicForm({
                kind: 'contact',
                honeypot: payload.honeypot || '',
                full_name: payload.full_name,
                email: payload.email,
                phone: payload.phone,
                subject: payload.subject,
                message: payload.message,
                source_url: payload.source_url,
                client_fingerprint: payload.client_fingerprint
            });
            return;
        } catch (error) {
            // Fallback: insert directo con RLS si la Edge Function aún no está deployada.
            if (!supabaseClient) throw error;
            const { error: insertError } = await supabaseClient.from('contact_messages').insert(payload);
            if (insertError) throw insertError;
            return;
        }
    }

    const localMessages = JSON.parse(localStorage.getItem('crowforza_contact_messages') || '[]');
    localMessages.push({ ...payload, created_at: new Date().toISOString() });
    localStorage.setItem('crowforza_contact_messages', JSON.stringify(localMessages));
}

async function persistNewsletterSubscription(payload) {
    if (isSupabaseConfigured()) {
        try {
            await submitPublicForm({
                kind: 'newsletter',
                honeypot: payload.honeypot || '',
                email: payload.email,
                source: payload.source,
                source_url: payload.source_url,
                client_fingerprint: payload.client_fingerprint
            });
            return;
        } catch (error) {
            if (!supabaseClient) throw error;
            // Solo INSERT (sin upsert): no hay policy UPDATE para el cliente.
            const { error: insertError } = await supabaseClient
                .from('newsletter_subscribers')
                .insert(payload);
            if (insertError) {
                if (insertError.code === '23505') return; // ya suscripto
                throw insertError;
            }
            return;
        }
    }

    const localSubscribers = JSON.parse(localStorage.getItem('crowforza_newsletter_subscribers') || '[]');
    const existingIndex = localSubscribers.findIndex((entry) => entry.email === payload.email);
    if (existingIndex >= 0) {
        localSubscribers[existingIndex] = { ...localSubscribers[existingIndex], ...payload };
    } else {
        localSubscribers.push({ ...payload, created_at: new Date().toISOString() });
    }
    localStorage.setItem('crowforza_newsletter_subscribers', JSON.stringify(localSubscribers));
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



// ========== VIDEO FALLBACK ==========
function initVideoFallback() {
    const video = document.getElementById('hero-video');
    const fallbackBg = document.querySelector('.hero__fallback-bg');
    if (!video) return;

    const showFallback = () => {
        video.style.display = 'none';
        if (fallbackBg) fallbackBg.style.zIndex = '0';
    };

    video.addEventListener('error', showFallback);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        video.removeAttribute('autoplay');
        video.pause();
        return;
    }

    video.play().catch(showFallback);
}

// ========== ABOUT SLIDESHOW ==========
function initAboutSlideshow() {
    const slideshow = document.getElementById('about-slideshow');
    const indicatorsContainer = document.getElementById('about-indicators');
    if (!slideshow || !indicatorsContainer) return;

    // Rutas bajo /public para que Vite las sirva también en Vercel (dist/)
    const aboutMedia = [
        { src: '/assets/videos/1amoladora2.mp4', poster: '/assets/videos/posters/1amoladora2.webp', label: 'Operario con amoladora' },
        { src: '/assets/videos/2demoledor.mp4', poster: '/assets/videos/posters/2demoledor.webp', label: 'Demoledor industrial en uso' },
        { src: '/assets/videos/3soldador.mp4', poster: '/assets/videos/posters/3soldador.webp', label: 'Trabajo profesional de soldadura' },
        { src: '/assets/videos/4amoladora.mp4', poster: '/assets/videos/posters/4amoladora.webp', label: 'Amoladora en operación' }
    ];

    // Tiempo visible por slide (ms): 6 segundos para todos.
    const durationsMs = [5000, 5000, 5000, 5000];

    slideshow.innerHTML =
        aboutMedia
            .map(
                (media, index) => `
            <div class="about__slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
                <video muted playsinline preload="none" poster="${media.poster}" data-src="${media.src}" aria-label="${media.label}">
                    Tu navegador no soporta videos HTML5.
                </video>
            </div>
        `
            )
            .join('') +
        `<div class="about__watermark" aria-hidden="true">
            <span class="about__watermark-wordmark"><span class="logo-crow">CROW</span><span class="logo-forza">FORZA</span></span>
            <picture>
                <source srcset="/assets/logo-crowforza.webp" type="image/webp">
                <img src="/assets/logo-crowforza.jpg" alt="" width="54" height="54" decoding="async">
            </picture>
        </div>`;

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

    const ensureVideoSource = (video) => {
        if (!video || video.getAttribute("src")) return;
        const src = video.getAttribute("data-src");
        if (!src) return;
        video.src = src;
        video.load();
    };

    const syncVideosForSlide = (activeIndex) => {
        videos.forEach((video, i) => {
            if (!video) return;
            if (i === activeIndex) {
                ensureVideoSource(video);
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

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        syncVideosForSlide(currentSlide);
                        scheduleNext();
                    } else {
                        clearSchedule();
                        videos.forEach((video) => video?.pause());
                    }
                });
            },
            { threshold: 0.35 }
        );
        observer.observe(slideshow);
    }
}

function initCookieBanner() {
    const banner = document.getElementById("cookie-banner");
    const accept = document.getElementById("cookie-accept");
    if (!banner || !accept) return;
    if (localStorage.getItem("crowforza_cookies") === "accepted") {
        banner.hidden = true;
        return;
    }
    banner.hidden = false;
    accept.addEventListener("click", () => {
        localStorage.setItem("crowforza_cookies", "accepted");
        banner.hidden = true;
    });
}



