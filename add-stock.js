const API_URL = 'https://script.google.com/macros/s/AKfycbxV-GR9HvCFMt3AZPWYfwruYc97cAcRpmvbDDcEcCFylZoUxmUyJsmvgeNuObDt0HyUpA/exec';

let availableStock = [];
let selectedProductVal = '';
let selectedColorVal = ''; // Added to track selected color

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
const saveBtnBtn = document.getElementById('save-btn');
const statusMessage = document.getElementById('status-message');
const loaderSpinner = document.querySelector('.loader-spinner');
const btnText = saveBtnBtn.querySelector('span');

async function init() {
    try {
        btnText.textContent = "Cargando datos...";
        loaderSpinner.style.display = 'block';
        saveBtnBtn.disabled = true;

        const response = await fetch(API_URL);
        const data = await response.json();

        availableStock = data.stock || [];

        const hardcodedProducts = [
            "Nike Air Force",
            "Adidas Spezial",
            "Adidas Spezial Retro",
            "On Cloud",
            "Birkenstock"
        ];

        // Solo usar estrictamente la lista fijada (nada del catálogo dinámico)
        const myColors = {
            "Nike Air Force": ["White"],
            "Adidas Spezial": ["Black", "Blue", "PinkBlack", "Pink", "Red", "PinkRed", "Beige", "Brown", "DarkBrown", "LightBlue"],
            "Adidas Spezial Retro": ["Pink", "Purple", "Green"],
            "Birkenstock": ["Green", "Sand", "Brown", "Black", "Pink", "DarkBrown"],
            "On Cloud": ["Black", "BlackWhite", "White", "Grey"]
        };

        let modelColorsMap = new Map();
        for (const [model, colors] of Object.entries(myColors)) {
            modelColorsMap.set(model, new Set(colors));
        }

        window.modelColorsMap = modelColorsMap;

        // Cargar solo los modelos hardcodeados elegidos
        loadProducts(hardcodedProducts);

        btnText.textContent = "Guardar Stock";
        loaderSpinner.style.display = 'none';

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

    // Only use the specific hardcoded colors we defined for this product
    const colors = Array.from(window.modelColorsMap.get(selectedProductVal) || []);
    const colorsWithMissing = [];
    colors.forEach(color => {
        const inStockSizes = availableStock
            .filter(item =>
                item.Product.trim().toLowerCase() === selectedProductVal.trim().toLowerCase() &&
                item.Color.trim().toLowerCase() === color.trim().toLowerCase()
            )
            .map(item => item.Size.toString());

        let missingCount = 0;
        for (let s = 36; s <= 44; s++) {
            if (!inStockSizes.includes(s.toString())) missingCount++;
        }

        colorsWithMissing.push({ color, missingCount, inStockSizes });
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
        div.innerHTML = `${data.color} <br><span style="font-size:11px; color:var(--text-secondary);">${data.missingCount} a pedir</span>`;

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
            onColorSelected(data.inStockSizes);
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
        onColorSelected([]); // El nuevo color tiene 0 en stock
    });

    colorsGrid.appendChild(newColorDiv);
}

function onColorSelected(inStockSizes = []) {
    sizesGroup.style.display = 'block';
    sizesGrid.innerHTML = '';

    for (let size = 36; size <= 44; size++) {
        const sizeStr = size.toString();
        const isInStock = inStockSizes.includes(sizeStr);

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.gap = '8px';
        div.style.padding = '12px';

        // Auto-select styles if missing, transparent if stocked
        div.style.background = isInStock ? 'transparent' : 'rgba(88, 166, 255, 0.2)';
        div.style.borderRadius = '8px';
        div.style.border = isInStock ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(88, 166, 255, 0.6)';
        div.style.cursor = isInStock ? 'not-allowed' : 'pointer';
        div.style.transition = 'all 0.2s ease';
        div.style.userSelect = 'none';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = sizeStr;
        checkbox.id = `size-${sizeStr}`;
        checkbox.name = 'newSizes[]';
        checkbox.style.display = 'none';

        if (isInStock) {
            checkbox.disabled = true;
        } else {
            checkbox.checked = true; // Auto-seleccionar las que faltan
        }

        const label = document.createElement('label');
        label.htmlFor = `size-${sizeStr}`;
        label.textContent = sizeStr;
        label.style.cursor = isInStock ? 'not-allowed' : 'pointer';
        label.style.color = isInStock ? 'var(--text-secondary)' : 'var(--text-primary)';
        label.style.marginBottom = '0';
        label.style.fontWeight = '600';
        label.style.fontSize = '16px';
        label.style.pointerEvents = 'none';

        if (isInStock) {
            const badge = document.createElement('span');
            badge.textContent = '(Stock)';
            badge.style.fontSize = '12px';
            badge.style.display = 'block';
            badge.style.fontWeight = '500';
            badge.style.color = 'var(--text-secondary)';
            badge.style.marginTop = '2px';

            const txtContainer = document.createElement('div');
            txtContainer.style.textAlign = 'center';
            txtContainer.appendChild(label);
            txtContainer.appendChild(badge);
            div.appendChild(checkbox);
            div.appendChild(txtContainer);
        } else {
            const badge = document.createElement('span');
            badge.textContent = '(A pedir)';
            badge.style.fontSize = '12px';
            badge.style.display = 'block';
            badge.style.fontWeight = '500';
            badge.style.color = '#58a6ff';
            badge.style.marginTop = '2px';

            const txtContainer = document.createElement('div');
            txtContainer.style.textAlign = 'center';
            txtContainer.appendChild(label);
            txtContainer.appendChild(badge);

            div.appendChild(checkbox);
            div.appendChild(txtContainer);
        }

        sizesGrid.appendChild(div);

        div.addEventListener('click', (e) => {
            if (isInStock) return;
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                div.style.background = 'rgba(88, 166, 255, 0.2)';
                div.style.border = '1px solid rgba(88, 166, 255, 0.6)';
            } else {
                div.style.background = 'rgba(255, 255, 255, 0.05)';
                div.style.border = '1px solid var(--border-color)';
            }
            checkFormValidity();
        });
    }
    checkFormValidity();
}

colorInput.addEventListener('input', checkFormValidity);
priceInput.addEventListener('input', checkFormValidity);
newProductInput.addEventListener('input', checkFormValidity);

function checkFormValidity() {
    const checkedBoxes = document.querySelectorAll('input[name="newSizes[]"]:checked');
    const customColorVal = colorInput.value.trim();
    const customProductVal = newProductInput.value.trim();

    // Valid es si tenemos algun color seleccionado
    let finalColor = selectedColorVal === 'NEW' ? customColorVal : selectedColorVal;
    let finalProduct = selectedProductVal === 'NEW' ? customProductVal : selectedProductVal;

    if (checkedBoxes.length > 0 && priceInput.value.trim() !== '' && finalColor !== '' && finalProduct !== '') {
        saveBtnBtn.disabled = false;
    } else {
        saveBtnBtn.disabled = true;
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customColorVal = colorInput.value.trim();
    const finalColor = selectedColorVal === 'NEW' ? customColorVal : selectedColorVal;

    const customProductVal = newProductInput.value.trim();
    const finalProduct = selectedProductVal === 'NEW' ? customProductVal : selectedProductVal;

    const priceRaw = priceInput.value.replace(',', '.');
    const boughtPrice = parseFloat(priceRaw);

    const selectedSizes = Array.from(document.querySelectorAll('input[name="newSizes[]"]:checked')).map(cb => cb.value);

    if (selectedSizes.length === 0 || finalProduct === '') return;

    btnText.style.display = 'none';
    loaderSpinner.style.display = 'block';
    saveBtnBtn.disabled = true;
    statusMessage.className = 'status-message';
    statusMessage.style.display = 'none';

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'addStock',
                product: finalProduct,
                color: finalColor,
                sizes: selectedSizes,
                boughtPrice: boughtPrice
            })
        });

        statusMessage.textContent = `¡${selectedSizes.length} pares añadidos al excel!`;
        statusMessage.className = 'status-message success';

        // Reset manual
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

        setTimeout(() => {
            statusMessage.style.display = 'none';
            init(); // Recargamos
        }, 2000);

    } catch (err) {
        console.error("Error al guardar:", err);
        statusMessage.textContent = 'Error al registrar en Google.';
        statusMessage.className = 'status-message error';

        btnText.style.display = 'block';
        loaderSpinner.style.display = 'none';
        saveBtnBtn.disabled = false;
    }
});

window.addEventListener('DOMContentLoaded', init);
