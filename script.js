const API_URL = 'https://script.google.com/macros/s/AKfycby4kQlZ_m4t_8bp9NS_7fm5mq7G5_6LzHSy2Y3xpyERI0ysub30GuOH9-YxFWsG-CzlTQ/exec';

let availableStock = [];
let affiliates = [];

// Referencias a los elementos del DOM
const affiliateSelect = document.getElementById('affiliate');
const productSelect = document.getElementById('product');
const colorSelect = document.getElementById('color');
const sizeSelect = document.getElementById('size');
const dateInput = document.getElementById('date');
const form = document.getElementById('sales-form');
const saveBtnBtn = document.getElementById('save-btn');
const statusMessage = document.getElementById('status-message');
const loaderSpinner = document.querySelector('.loader-spinner');
const btnText = saveBtnBtn.querySelector('span');

// 1. Cargar datos del Excel
async function loadDataFromExcel() {
    try {
        btnText.textContent = "Cargando datos...";
        loaderSpinner.style.display = 'block';
        saveBtnBtn.disabled = true;

        const response = await fetch(API_URL);
        const data = await response.json();

        availableStock = data.stock || [];
        affiliates = data.affiliates || [];

        loadAffiliates();
        loadProducts();

        btnText.textContent = "Guardar Venta";
        loaderSpinner.style.display = 'none';
        saveBtnBtn.disabled = false;
    } catch (error) {
        console.error("Error cargando datos:", error);
        statusMessage.textContent = 'Error al cargar los datos de Excel. Recarga la página.';
        statusMessage.className = 'status-message error';
        loaderSpinner.style.display = 'none';
        btnText.textContent = "Error";
    }
}

// 2. Rellenar afiliados (Ofi)
function loadAffiliates() {
    affiliateSelect.innerHTML = '<option value="" disabled selected>Selecciona Ofi</option>';
    affiliates.forEach(aff => {
        const option = document.createElement('option');
        option.value = aff.mail; // Guardamos el mail internamente
        option.textContent = "Ofi " + aff.ofi; // Mostramos el número de Ofi
        affiliateSelect.appendChild(option);
    });
}

function loadProducts() {
    productSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';

    let uniqueProducts = [...new Set(availableStock.map(item => item.Product))].filter(p => p);

    uniqueProducts.sort().forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
    });
}


// 4. Al seleccionar producto, cargar colores
productSelect.addEventListener('change', (e) => {
    const selectedProduct = e.target.value;

    // Resetear colores y tallas
    colorSelect.innerHTML = '<option value="" disabled selected>Selecciona un color</option>';
    sizeSelect.innerHTML = '<option value="" disabled selected>Selecciona una talla</option>';
    colorSelect.disabled = false;
    sizeSelect.disabled = true;

    const uniqueColors = [...new Set(
        availableStock
            .filter(item => (item.Product || "").toString().trim().toLowerCase() === selectedProduct.toString().trim().toLowerCase())
            .map(item => item.Color.toString().trim())
    )];

    uniqueColors.sort().forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });
});

// 5. Al seleccionar color, cargar tallas
colorSelect.addEventListener('change', (e) => {
    const selectedProduct = productSelect.value;
    const selectedColor = e.target.value;

    // Resetear tallas
    sizeSelect.innerHTML = '<option value="" disabled selected>Selecciona una talla</option>';
    sizeSelect.disabled = false;

    const uniqueSizes = [...new Set(
        availableStock
            .filter(item => 
                (item.Product || "").toString().trim().toLowerCase() === selectedProduct.toString().trim().toLowerCase() && 
                (item.Color || "").toString().trim().toLowerCase() === selectedColor.toString().trim().toLowerCase()
            )
            .map(item => item.Size.toString().trim())
    )].sort((a, b) => parseFloat(a) - parseFloat(b));

    uniqueSizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelect.appendChild(option);
    });
});

// Inicializar fecha de hoy
function initDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// 6. Manejo del envío del formulario (Guardar)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const soldAffiliate = affiliateSelect.value;
    const soldProduct = productSelect.value;
    const soldColor = colorSelect.value;
    const soldSize = sizeSelect.value;
    const priceRaw = document.getElementById('price').value.replace(',', '.');
    const soldPrice = parseFloat(priceRaw);
    const soldDate = typeof dateInput.value === 'string' ? dateInput.value : '';

    // Mostrar UI de carga
    btnText.style.display = 'none';
    loaderSpinner.style.display = 'block';
    saveBtnBtn.disabled = true;
    statusMessage.className = 'status-message';
    statusMessage.style.display = 'none';

    try {
        // Encontrar la pestaña donde está este producto actualmente
        const stockItem = availableStock.find(i =>
            i.Product === soldProduct &&
            i.Color === soldColor &&
            i.Size === soldSize
        );
        const targetSheetName = stockItem ? stockItem.SheetName : null;

        // Petición a Google Sheets
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain', // Usamos text/plain para evitar errores de CORS con preflight
            },
            body: JSON.stringify({
                sheetName: targetSheetName,
                affiliate: soldAffiliate,
                product: soldProduct,
                color: soldColor,
                size: soldSize,
                price: soldPrice,
                date: soldDate
            })
        });

        // Ojo: con 'no-cors' la respuesta es opaca, no podemos leer el JSON que nos devuelve,
        // pero podemos asumir que si no saltó al bloque 'catch', fue un éxito de red.

        statusMessage.textContent = '¡Venta registrada con éxito!';
        statusMessage.className = 'status-message success';

        // Remover de la lista en vivo el que acabamos de vender
        const index = availableStock.findIndex(i =>
            i.Product === soldProduct &&
            i.Color === soldColor &&
            i.Size === soldSize
        );
        if (index > -1) {
            availableStock.splice(index, 1);
        }

        form.reset();
        initDate();

        affiliateSelect.value = "";
        productSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto</option>';
        colorSelect.innerHTML = '<option value="" disabled selected>Selecciona un color</option>';
        sizeSelect.innerHTML = '<option value="" disabled selected>Selecciona una talla</option>';
        colorSelect.disabled = true;
        sizeSelect.disabled = true;

        loadProducts();

    } catch (err) {
        console.error("Error al guardar:", err);
        statusMessage.textContent = 'Error al registrar la venta en Google.';
        statusMessage.className = 'status-message error';
    } finally {
        // Restaurar botón
        btnText.style.display = 'block';
        loaderSpinner.style.display = 'none';
        saveBtnBtn.disabled = false;

        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    initDate();
    loadDataFromExcel(); // Esto inicia la carga real de Google Sheets
});
