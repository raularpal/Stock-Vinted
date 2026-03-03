function doGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        var sheets = spreadsheet.getSheets();
        var availableStock = [];
        var allStats = [];

        // Recorrer todas las hojas (para coger históricos de 2025, etc.)
        for (var s = 0; s < sheets.length; s++) {
            var currentSheet = sheets[s];
            var sheetName = currentSheet.getName();

            // Ignorar la hoja de configuración
            if (sheetName.toUpperCase() === "SETTINGS") continue;

            var data = currentSheet.getDataRange().getValues();

            // Asumimos que la fila 1 (index 0) son los títulos, la lectura empieza en i=1
            for (var i = 1; i < data.length; i++) {
                var row = data[i];
                // Comprobamos que la fila tenga al menos 6 columnas (hasta el index 5)
                if (row.length < 6) continue;

                var monthLabel = row[0]; // Ej. 01/25
                var status = row[5]; // Estado en la columna F (índice 5)
                var soldPrice = row.length > 6 ? row[6] : 0;
                var dateStr = row.length > 7 ? row[7] : '';
                var boughtPrice = row.length > 8 ? row[8] : 0;
                var benefits = row.length > 9 ? row[9] : 0;

                // Evitar guardar la fila de títulos si se repiten en otra hoja (Month en vez de 01/25)
                if (monthLabel && monthLabel.toString().toUpperCase() === "MONTH") continue;

                // Guardar para las estadísticas (todas las filas reales)
                if (monthLabel) {
                    allStats.push({
                        Month: monthLabel.toString(),
                        Status: status ? status.toString().trim() : "",
                        SoldPrice: soldPrice,
                        Date: dateStr ? dateStr.toString() : "",
                        BoughtPrice: boughtPrice,
                        Benefits: benefits
                    });
                }

                // Extrae los que su columna Status sea "Available" en cualquier hoja
                // NUEVO: Filtramos para que SOLO recoja el stock disponible de la pestaña "COMANDES".
                // De esta manera ignoramos las pestañas antiguas como "xx" o "COMANDESv2" que tienen inventario obsoleto.
                if (status && status.toString().trim().toLowerCase() === "available" && sheetName.toUpperCase() === "COMANDES") {
                    availableStock.push({
                        Product: row[1],
                        Size: row[2].toString(),
                        Color: row[3],
                        BoughtPrice: boughtPrice, // GUARDAMOS ESTO PARA EL CÁLCULO PRECISO DEL INVENTARIO MÚLTIPLE
                        SheetName: sheetName // Guardamos su hoja origen para el doPost
                    });
                }
            }
        }


        // Recopilamos un catálogo de todos los modelos únicos que existen (hayan sido vendidos o no)
        var catalogList = [];

        // Leer afiliados
        var settingsSheet = spreadsheet.getSheetByName("SETTINGS");
        var affiliatesList = [];
        if (settingsSheet) {
            var settingsData = settingsSheet.getDataRange().getValues();
            for (var j = 1; j < settingsData.length; j++) {
                var aff = settingsData[j][0];
                if (aff) {
                    affiliatesList.push(aff.toString());
                }
            }
        }

        // Función rápida para limpiar duplicados del catálogo
        var uniqueCatalog = [];
        var catalogMap = {};

        for (var c = 0; c < allStats.length; c++) {
            // Recuperar los nombres de la hoja directamente (nos basamos en availableStock y extras que leamos)
            // Nota: En la versión anterior doGET, allStats no guardaba Product ni Color, así que lo añadimos aquí a mano
        }

        // Mejor manera: vamos a extraer todo el catálogo de las hojas directamente
        for (var s = 0; s < sheets.length; s++) {
            var sheet = sheets[s];
            if (sheet.getName().toUpperCase() === "SETTINGS") continue;
            var data2 = sheet.getDataRange().getValues();
            for (var i2 = 1; i2 < data2.length; i2++) {
                var r = data2[i2];
                if (r.length < 4) continue;
                var prd = r[1];
                var col = r[3];
                if (prd && prd.toString().toUpperCase() !== "MODELO") {
                    var key = prd + "_" + col;
                    if (!catalogMap[key]) {
                        catalogMap[key] = true;
                        catalogList.push({
                            Product: prd,
                            Color: col
                        });
                    }
                }
            }
        }

        var result = {
            stock: availableStock,
            affiliates: affiliatesList,
            stats: allStats,
            catalog: catalogList
        };

        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ "error": e.message })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    try {
        var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        var body = JSON.parse(e.postData.contents);
        // Si la acción es "addStock", añadimos filas nuevas
        if (body.action === "addStock") {
            var newSizes = body.sizes || []; // Array de tallas, ej. ["38", "40", "42"]
            var targetSheetName = "COMANDES"; // Siempre añadimos stock nuevo en COMANDES
            var comandesSheet = spreadsheet.getSheetByName(targetSheetName);

            if (!comandesSheet) {
                return ContentService.createTextOutput(JSON.stringify({ "error": "Hoja COMANDES no existe" })).setMimeType(ContentService.MimeType.JSON);
            }

            var today = new Date();
            var day = today.getDate();
            var month = today.getMonth() + 1;
            var year = today.getFullYear();
            // Formato DD/MM/YYYY ej: 1/03/2026
            var dateLabel = day + "/" + (month < 10 ? "0" + month : month) + "/" + year;

            for (var s = 0; s < newSizes.length; s++) {
                var size = newSizes[s];
                var nextRow = comandesSheet.getLastRow() + 1;
                var formula = "=I" + nextRow + "+G" + nextRow;
                var negativePrice = -Math.abs(body.boughtPrice);

                comandesSheet.appendRow([
                    dateLabel,
                    body.product,
                    size,
                    body.color,
                    "",
                    "Available",
                    "",
                    "",
                    negativePrice,
                    formula
                ]);
            }

            return ContentService.createTextOutput(JSON.stringify({ "success": true, "message": "Stock añadido." })).setMimeType(ContentService.MimeType.JSON);
        }

        // Si NO es addStock, sigue el flujo normal de VENTA
        var targetProduct = body.product;
        var targetColor = body.color;
        var targetSize = body.size;
        var targetAffiliate = body.affiliate;
        var targetPrice = body.price;
        var targetDate = body.date;
        var targetSheetName = body.sheetName || "COMANDES"; // Recibimos de qué pestaña es

        var rowUpdated = false;
        var targetSheet = spreadsheet.getSheetByName(targetSheetName);

        if (targetSheet) {
            var data = targetSheet.getDataRange().getValues();

            for (var i = 1; i < data.length; i++) {
                var row = data[i];
                if (row.length < 6) continue;

                if (
                    row[1] == targetProduct &&
                    row[2].toString() == targetSize &&
                    row[3] == targetColor &&
                    row[5].toString().trim().toLowerCase() == "available"
                ) {
                    var rowNumber = i + 1;

                    targetSheet.getRange(rowNumber, 5).setValue(targetAffiliate);
                    targetSheet.getRange(rowNumber, 6).setValue("Sold");
                    targetSheet.getRange(rowNumber, 7).setValue(targetPrice);
                    targetSheet.getRange(rowNumber, 7).setNumberFormat('0.00" €"');

                    var dateParts = targetDate.split('-');
                    if (dateParts.length === 3) {
                        var formattedDate = dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
                        targetSheet.getRange(rowNumber, 8).setValue(formattedDate);
                    } else {
                        targetSheet.getRange(rowNumber, 8).setValue(targetDate);
                    }

                    rowUpdated = true;
                    break;
                }
            }
        }

        if (rowUpdated) {
            return ContentService.createTextOutput(JSON.stringify({ "success": true })).setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({ "error": "Producto no encontrado o ya vendido" })).setMimeType(ContentService.MimeType.JSON);
        }

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "error": error.message })).setMimeType(ContentService.MimeType.JSON);
    }
}
