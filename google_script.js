function doGet(e) {
    try {
        var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        var comandesSheet = spreadsheet.getSheetByName("COMANDES");
        var availableStock = [];

        // Cargar productos de la hoja COMANDES
        if (comandesSheet) {
            var data = comandesSheet.getDataRange().getValues();

            // Asumimos que la fila 1 (index 0) son los títulos, la lectura empieza en i=1
            for (var i = 1; i < data.length; i++) {
                var row = data[i];
                // Comprobamos que la fila tenga al menos 6 columnas (hasta el index 5)
                if (row.length < 6) continue;

                var status = row[5]; // Estado en la columna F (índice 5)

                // Extrae SOLO los que su columna Status sea "Available"
                if (status && status.toString().trim().toLowerCase() === "available") {
                    availableStock.push({
                        Product: row[1],
                        Size: row[2].toString(),
                        Color: row[3],
                        SheetName: "COMANDES" // Fijo para el doPost
                    });
                }
            }
        }

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

        var result = {
            stock: availableStock,
            affiliates: affiliatesList
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
        var targetProduct = body.product;
        var targetColor = body.color;
        var targetSize = body.size;
        var targetAffiliate = body.affiliate;
        var targetPrice = body.price;
        var targetDate = body.date;
        var targetSheetName = body.sheetName; // Recibimos de qué pestaña es

        var rowUpdated = false;
        var comandesSheet = spreadsheet.getSheetByName("COMANDES");

        if (comandesSheet) {
            var data = comandesSheet.getDataRange().getValues();

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

                    comandesSheet.getRange(rowNumber, 5).setValue(targetAffiliate);
                    comandesSheet.getRange(rowNumber, 6).setValue("Sold");
                    comandesSheet.getRange(rowNumber, 7).setValue(targetPrice);
                    comandesSheet.getRange(rowNumber, 7).setNumberFormat('0.00" €"');

                    var dateParts = targetDate.split('-');
                    if (dateParts.length === 3) {
                        var formattedDate = dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0];
                        comandesSheet.getRange(rowNumber, 8).setValue(formattedDate);
                    } else {
                        comandesSheet.getRange(rowNumber, 8).setValue(targetDate);
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
