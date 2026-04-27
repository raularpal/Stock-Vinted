const API_URL = 'https://script.google.com/macros/s/AKfycby4kQlZ_m4t_8bp9NS_7fm5mq7G5_6LzHSy2Y3xpyERI0ysub30GuOH9-YxFWsG-CzlTQ/exec';

let availableStock = [];
let selectedProductVal = '';
let selectedColorVal = ''; // Added to track selected color
let cart = [];
let currentSizesSelection = {}; // Track quantities for the current selection

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const productContainer = document.getElementById('product-container');
const newProductInput = document.getElementById('new-product');
const colorsGroup = document.getElementById('colors-group');
const colorsGrid = document.getElementById('colors-grid');
const colorContainer = document.getElementById('color-container');
const colorInput = document.getElementById('color');
const sizesGroup = document.getElementById('sizes-group');
const sizesGrid = document.getElementById('sizes-grid');
const priceInput = document.getElementById('price');
const form = document.getElementById('add-stock-form');

const addToCartBtn = document.getElementById('add-to-cart-btn');
const saveAllBtn = document.getElementById('save-all-btn');
const statusMessage = document.getElementById('status-message');
const loaderSpinner = saveAllBtn.querySelector('.loader-spinner');
const btnText = saveAllBtn.querySelector('span');

const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPairs = document.getElementById('cart-total-pairs');
const cartTotalPrice = document.getElementById('cart-total-price');

async function init() {
    try {
        btnText.textContent = "Cargando datos...";
        loaderSpinner.style.display = 'block';
        saveAllBtn.disabled = true;
        addToCartBtn.disabled = true;

        const response = await fetch(API_URL);
        const data = await response.json();

        availableStock = data.stock || [];
        const catalog = data.catalog || [];

        // Si desiredStock viene vacío o no existe, lo construimos desde el catalog
        let desiredStock = data.desiredStock || {};
        if (Object.keys(desiredStock).length === 0 && catalog.length > 0) {
            console.log("Usando catálogo como fallback para desiredStock");
            catalog.forEach(item => {
                if (!desiredStock[item.Product]) {
                    desiredStock[item.Product] = {};
                }
                if (!desiredStock[item.Product][item.Color]) {
                    desiredStock[item.Product][item.Color] = ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
                }
            });
        }

        window.desiredStock = desiredStock;
        const hardcodedProducts = Object.keys(desiredStock);

        let modelColorsMap = new Map();
        for (const [model, val] of Object.entries(desiredStock)) {
            if (val && !Array.isArray(val) && typeof val === 'object') {
                // Nueva estructura: { "Color1": ["Size1", ...]}
                modelColorsMap.set(model, new Set(Object.keys(val)));
            } else if (Array.isArray(val)) {
                // Estructura vieja (o fallback parcial): ["Color1", "Color2"]
                modelColorsMap.set(model, new Set(val));
            } else {
                modelColorsMap.set(model, new Set());
            }
        }

        window.modelColorsMap = modelColorsMap;

        // Cargar modelos (alfabéticamente)
        loadProducts(hardcodedProducts.sort());

        btnText.textContent = "🚀 Guardar Todo el Stock";
        loaderSpinner.style.display = 'none';
        updateCartUI();


    } catch (error) {
        console.error("Error al cargar:", error);
        statusMessage.textContent = 'Error. Recarga la página.';
        statusMessage.className = 'status-message error';
        loaderSpinner.style.display = 'none';
        btnText.textContent = "Error";
    }
}

function loadProducts(products) {
    productsGrid.innerHTML = '';
    products.forEach(product => {
        const div = document.createElement('div');
        div.style.padding = '12px 10px';
        div.style.background = 'rgba(255, 255, 255, 0.05)';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid var(--border-color)';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.3s ease';
        div.style.textAlign = 'center';
        div.style.fontWeight = '500';
        div.style.fontSize = '14px';
        div.textContent = product;

        div.addEventListener('click', () => {
            Array.from(productsGrid.children).forEach(child => {
                child.style.background = 'rgba(255, 255, 255, 0.05)';
                child.style.border = '1px solid var(--border-color)';
            });
            div.style.background = 'rgba(88, 166, 255, 0.2)';
            div.style.border = '1px solid rgba(88, 166, 255, 0.6)';

            selectedProductVal = product;
            onProductSelected();
        });

        productsGrid.appendChild(div);
    });

    // Añadir botón "+ Nuevo Modelo"
    const newProductDiv = document.createElement('div');
    newProductDiv.style.padding = '12px 10px';
    newProductDiv.style.background = 'rgba(255, 255, 255, 0.05)';
    newProductDiv.style.borderRadius = '8px';
    newProductDiv.style.border = '1px dashed var(--border-color)';
    newProductDiv.style.cursor = 'pointer';
    newProductDiv.style.transition = 'all 0.3s ease';
    newProductDiv.style.textAlign = 'center';
    newProductDiv.style.fontWeight = '500';
    newProductDiv.style.fontSize = '14px';
    newProductDiv.textContent = '➕ Nuevo Modelo';

    newProductDiv.addEventListener('click', () => {
        Array.from(productsGrid.children).forEach(child => {
            child.style.background = 'rgba(255, 255, 255, 0.05)';
            child.style.border = '1px solid var(--border-color)';
        });
        newProductDiv.style.background = 'rgba(88, 166, 255, 0.2)';
        newProductDiv.style.border = '1px dashed rgba(88, 166, 255, 0.6)';

        selectedProductVal = 'NEW';
        onProductSelected();
    });

    productsGrid.appendChild(newProductDiv);
}

function onProductSelected() {
    if (selectedProductVal === 'NEW') {
        productContainer.style.display = 'block';
        newProductInput.focus();
        colorsGroup.style.display = 'none';
        colorContainer.style.display = 'block';
        selectedColorVal = 'NEW';
        colorInput.value = '';
        sizesGroup.style.display = 'none';
        sizesGrid.innerHTML = '';
        onColorSelected([]); // Mostrar listado de tallas vacio (todo nuevo)
        checkFormValidity();
        return;
    }

    productContainer.style.display = 'none';
    newProductInput.value = '';
    colorsGroup.style.display = 'block';
    colorContainer.style.display = 'none';
    sizesGroup.style.display = 'none';
    sizesGrid.innerHTML = '';
    selectedColorVal = '';
    colorInput.value = '';

    const colors = Array.from(window.modelColorsMap.get(selectedProductVal) || []);
    const colorsWithMissing = [];
    colors.forEach(color => {
        // Obtenemos los counts por talla
        const inStockDetails = availableStock
            .filter(item => {
                const itemProd = (item.Product || "").toString().trim().toLowerCase();
                const selProd = (selectedProductVal || "").toString().trim().toLowerCase();
                const itemColor = (item.Color || "").toString().trim().toLowerCase();
                const selColor = (color || "").toString().trim().toLowerCase();
                return itemProd === selProd && itemColor === selColor;
            })
            .reduce((acc, item) => {
                const sz = item.Size.toString().trim();
                acc[sz] = (acc[sz] || 0) + 1;
                return acc;
            }, {});

        // Get target sizes for this product/color from desiredStock
        const targetSizes = (window.desiredStock[selectedProductVal] && window.desiredStock[selectedProductVal][color]) 
            ? window.desiredStock[selectedProductVal][color] 
            : ["36", "37", "38", "39", "40", "41", "42", "43", "44"];

        let missingCount = 0;
        targetSizes.forEach(s => {
            if (!inStockDetails[s.toString().trim()]) missingCount++;
        });

        colorsWithMissing.push({ color, missingCount, inStockDetails, targetSizes });
    });


    renderColorsGrid(colorsWithMissing.sort((a, b) => a.color.localeCompare(b.color)));
}

function renderColorsGrid(colorsData) {
    colorsGrid.innerHTML = '';

    colorsData.forEach(data => {
        const div = document.createElement('div');
        div.style.padding = '12px 10px';
        div.style.background = 'rgba(255, 255, 255, 0.05)';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid var(--border-color)';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.3s ease';
        div.style.textAlign = 'center';
        div.style.fontWeight = '500';
        div.style.fontSize = '14px';
        div.innerHTML = `${data.color}`;

        div.addEventListener('click', () => {
            Array.from(colorsGrid.children).forEach(child => {
                child.style.background = 'rgba(255, 255, 255, 0.05)';
                child.style.border = '1px solid var(--border-color)';
            });
            div.style.background = 'rgba(88, 166, 255, 0.2)';
            div.style.border = '1px solid rgba(88, 166, 255, 0.6)';

            selectedColorVal = data.color;
            colorInput.value = ''; // Clear custom input
            colorContainer.style.display = 'none';
            onColorSelected(data.inStockDetails, data.targetSizes);
        });

        colorsGrid.appendChild(div);
    });

    // Añadir botón "+ Nuevo Color"
    const newColorDiv = document.createElement('div');
    newColorDiv.style.padding = '12px 10px';
    newColorDiv.style.background = 'rgba(255, 255, 255, 0.05)';
    newColorDiv.style.borderRadius = '8px';
    newColorDiv.style.border = '1px dashed var(--border-color)';
    newColorDiv.style.cursor = 'pointer';
    newColorDiv.style.transition = 'all 0.3s ease';
    newColorDiv.style.textAlign = 'center';
    newColorDiv.style.fontWeight = '500';
    newColorDiv.style.fontSize = '14px';
    newColorDiv.textContent = '➕ Nuevo Color';

    newColorDiv.addEventListener('click', () => {
        Array.from(colorsGrid.children).forEach(child => {
            child.style.background = 'rgba(255, 255, 255, 0.05)';
            child.style.border = '1px solid var(--border-color)';
        });
        newColorDiv.style.background = 'rgba(88, 166, 255, 0.2)';
        newColorDiv.style.border = '1px dashed rgba(88, 166, 255, 0.6)';

        selectedColorVal = 'NEW';
        colorContainer.style.display = 'block';
        colorInput.focus();
        onColorSelected([], ["36", "37", "38", "39", "40", "41", "42", "43", "44"]); // El nuevo color tiene 0 en stock
    });

    colorsGrid.appendChild(newColorDiv);
}

function onColorSelected(inStockDetails = {}, targetSizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44"]) {
    sizesGroup.style.display = 'block';
    sizesGrid.innerHTML = '';
    currentSizesSelection = {}; // Reset selection for the new color

    targetSizes.forEach(sizeStr => {
        const stockCount = inStockDetails[sizeStr] || 0;
        currentSizesSelection[sizeStr] = 0;

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.padding = '12px 8px';
        div.style.position = 'relative';
        div.style.borderRadius = '12px';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        div.style.userSelect = 'none';
        div.style.background = 'rgba(255, 255, 255, 0.03)';
        div.style.border = '1px solid var(--border-color)';
        div.style.minHeight = '70px';

        // Size Label
        const label = document.createElement('span');
        label.textContent = sizeStr;
        label.style.fontWeight = '700';
        label.style.fontSize = '18px';
        label.style.color = 'var(--text-primary)';

        // Stock Badge
        const badge = document.createElement('span');
        badge.textContent = stockCount > 0 ? `${stockCount} stock` : 'Sin stock';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '500';
        badge.style.color = stockCount > 0 ? 'var(--text-secondary)' : '#ff4d4d';
        badge.style.marginTop = '2px';

        // Quantity Badge (Visible when > 0)
        const qtyBadge = document.createElement('div');
        qtyBadge.textContent = '0';
        qtyBadge.style.position = 'absolute';
        qtyBadge.style.top = '-8px';
        qtyBadge.style.right = '-8px';
        qtyBadge.style.background = 'var(--accent)';
        qtyBadge.style.color = 'white';
        qtyBadge.style.width = '24px';
        qtyBadge.style.height = '24px';
        qtyBadge.style.borderRadius = '50%';
        qtyBadge.style.display = 'none';
        qtyBadge.style.alignItems = 'center';
        qtyBadge.style.justifyContent = 'center';
        qtyBadge.style.fontSize = '12px';
        qtyBadge.style.fontWeight = 'bold';
        qtyBadge.style.boxShadow = '0 2px 8px rgba(88, 166, 255, 0.4)';
        qtyBadge.style.border = '2px solid var(--bg-color)';

        // Decrement Button
        const decBtn = document.createElement('div');
        decBtn.innerHTML = '−';
        decBtn.style.position = 'absolute';
        decBtn.style.bottom = '4px';
        decBtn.style.right = '4px';
        decBtn.style.width = '20px';
        decBtn.style.height = '20px';
        decBtn.style.borderRadius = '4px';
        decBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        decBtn.style.display = 'none';
        decBtn.style.alignItems = 'center';
        decBtn.style.justifyContent = 'center';
        decBtn.style.fontSize = '14px';
        decBtn.style.color = 'var(--text-secondary)';
        decBtn.style.transition = 'all 0.2s';

        decBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentSizesSelection[sizeStr] > 0) {
                currentSizesSelection[sizeStr]--;
                updateSizeUI();
            }
        });

        decBtn.addEventListener('mouseover', () => {
            decBtn.style.background = 'rgba(248, 81, 73, 0.2)';
            decBtn.style.color = 'var(--error)';
        });
        decBtn.addEventListener('mouseout', () => {
            decBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            decBtn.style.color = 'var(--text-secondary)';
        });

        function updateSizeUI() {
            const count = currentSizesSelection[sizeStr];
            if (count > 0) {
                div.style.background = 'rgba(88, 166, 255, 0.12)';
                div.style.border = '1px solid rgba(88, 166, 255, 0.5)';
                div.style.transform = 'scale(1.02)';
                qtyBadge.style.display = 'flex';
                qtyBadge.textContent = count;
                decBtn.style.display = 'flex';
            } else {
                div.style.background = 'rgba(255, 255, 255, 0.03)';
                div.style.border = '1px solid var(--border-color)';
                div.style.transform = 'scale(1)';
                qtyBadge.style.display = 'none';
                decBtn.style.display = 'none';
            }
            checkFormValidity();
        }

        div.appendChild(label);
        div.appendChild(badge);
        div.appendChild(qtyBadge);
        div.appendChild(decBtn);

        div.addEventListener('click', () => {
            currentSizesSelection[sizeStr]++;
            updateSizeUI();
            
            // Subtle click effect
            div.style.transform = 'scale(0.95)';
            setTimeout(() => { if(currentSizesSelection[sizeStr] > 0) div.style.transform = 'scale(1.02)'; }, 100);
        });

        sizesGrid.appendChild(div);
    });
    checkFormValidity();
}

colorInput.addEventListener('input', checkFormValidity);
priceInput.addEventListener('input', checkFormValidity);
newProductInput.addEventListener('input', checkFormValidity);

function checkFormValidity() {
    const totalSelected = Object.values(currentSizesSelection).reduce((acc, val) => acc + val, 0);
    const customColorVal = colorInput.value.trim();
    const customProductVal = newProductInput.value.trim();

    // Valid es si tenemos algun color seleccionado
    let finalColor = selectedColorVal === 'NEW' ? customColorVal : selectedColorVal;
    let finalProduct = selectedProductVal === 'NEW' ? customProductVal : selectedProductVal;

    if (totalSelected > 0 && priceInput.value.trim() !== '' && finalColor !== '' && finalProduct !== '') {
        addToCartBtn.disabled = false;
    } else {
        addToCartBtn.disabled = true;
    }
}

addToCartBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const customColorVal = colorInput.value.trim();
    const finalColor = selectedColorVal === 'NEW' ? customColorVal : selectedColorVal;

    const customProductVal = newProductInput.value.trim();
    const finalProduct = selectedProductVal === 'NEW' ? customProductVal : selectedProductVal;

    const priceRaw = priceInput.value.replace(',', '.');
    const boughtPrice = parseFloat(priceRaw);

    const selectedSizes = [];
    for (const [size, qty] of Object.entries(currentSizesSelection)) {
        for (let i = 0; i < qty; i++) {
            selectedSizes.push(size);
        }
    }

    if (selectedSizes.length === 0 || finalProduct === '') return;

    cart.push({
        id: Date.now(),
        product: finalProduct,
        color: finalColor,
        sizes: selectedSizes,
        boughtPrice: boughtPrice
    });

    updateCartUI();

    priceInput.value = '';
    colorInput.value = '';
    newProductInput.value = '';
    selectedProductVal = '';
    selectedColorVal = '';
    productContainer.style.display = 'none';
    colorContainer.style.display = 'none';
    sizesGroup.style.display = 'none';
    colorsGroup.style.display = 'none';
    Array.from(productsGrid.children).forEach(child => {
        child.style.background = 'rgba(255, 255, 255, 0.05)';
        child.style.border = '1px solid var(--border-color)';
    });
    checkFormValidity();
});

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let totalPairs = 0;
    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div id="empty-cart-msg" style="text-align:center; color:var(--text-secondary); font-size:14px; margin:auto;">
                El carrito está vacío
            </div>
        `;
        saveAllBtn.disabled = true;
    } else {
        saveAllBtn.disabled = false;
        cart.forEach(item => {
            const pairsCount = item.sizes.length;
            totalPairs += pairsCount;
            const itemTotalPrice = item.boughtPrice * pairsCount;
            totalPrice += itemTotalPrice;

            // Group sizes for cleaner display: "40, 40, 41" -> "40 (x2), 41"
            const sizeCounts = item.sizes.reduce((acc, s) => {
                acc[s] = (acc[s] || 0) + 1;
                return acc;
            }, {});
            const sizeString = Object.entries(sizeCounts)
                .map(([size, count]) => count > 1 ? `${size} (x${count})` : size)
                .join(', ');

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-header">
                    <div class="cart-item-title">${item.product} - ${item.color}</div>
                    <button type="button" class="remove-btn" onclick="removeFromCart(${item.id})" title="Eliminar">🗑️</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="cart-item-sizes">Tallas: ${sizeString} (${pairsCount} pares)</div>
                    <div class="cart-item-price">${itemTotalPrice.toFixed(2)} €</div>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
    }

    cartTotalPairs.textContent = totalPairs;
    cartTotalPrice.textContent = totalPrice.toFixed(2) + ' €';
}

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
};

saveAllBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;

    btnText.style.display = 'none';
    loaderSpinner.style.display = 'block';
    saveAllBtn.disabled = true;
    addToCartBtn.disabled = true;
    statusMessage.className = 'status-message';
    statusMessage.style.display = 'none';

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'addStockBulk',
                cart: cart
            })
        });

        const totalAddedPairs = cart.reduce((acc, curr) => acc + curr.sizes.length, 0);
        statusMessage.textContent = `¡${totalAddedPairs} pares añadidos al excel!`;
        statusMessage.className = 'status-message success';
        statusMessage.style.display = 'block';

        cart = [];
        updateCartUI();

        setTimeout(() => {
            statusMessage.style.display = 'none';
            btnText.style.display = 'block';
            init();
        }, 2000);

    } catch (err) {
        console.error("Error al guardar todo:", err);
        statusMessage.textContent = 'Error al registrar en Google.';
        statusMessage.className = 'status-message error';
        statusMessage.style.display = 'block';

        btnText.style.display = 'block';
        loaderSpinner.style.display = 'none';
        saveAllBtn.disabled = false;
        checkFormValidity();
    }
});

window.addEventListener('DOMContentLoaded', init);
