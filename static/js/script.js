const API_URL = "https://karthikeya-tails.onrender.com";
// const API_URL = "http://127.0.0.1:5000/";

document.getElementById("salesForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const products = [];
    document.querySelectorAll(".product-entry").forEach(productDiv => {
        const product_name = productDiv.querySelector(".product_name").value.trim();
        const quantity = parseFloat(productDiv.querySelector(".quantity").value.trim());
        // const rate = parseFloat(productDiv.querySelector(".price_per_unit").value.trim());
        const priceInput = productDiv.querySelector(".price_per_unit");
        if (!priceInput || priceInput.value.trim() === "") {
            console.error("Error: Missing value for rate");
            return;  // Prevents further execution
        }
        const rate = parseFloat(priceInput.value.trim()) || 0;  // Default to 0 if invalid

        const total_amount = quantity * rate;

        products.push({
            product_name,
            quantity,
            rate,
            total_amount
        });
    });

    const saleData = {
        date: document.getElementById("date").value.trim(),
        customer_name: document.getElementById("customer_name").value.trim(),
        village_name: document.getElementById("village_name").value.trim(),
        phone_no: document.getElementById("phone_no").value.trim(),
        products,
        grand_total: calculateGrandTotal()  // Include grand total in the sale data
    };

    try {
        const response = await fetch(`${API_URL}/add_sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();
        alert(result.message || result.error);

        if (response.ok) {
            loadSales();
            document.getElementById("salesForm").reset();
            document.getElementById("products").innerHTML = ""; // Clear products after submission
            addProductField(); // Add at least one product field again
            updateGrandTotal(); // Reset grand total
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while adding the sale.");
    }
});

async function loadSales() {
    try {
        const response = await fetch(`${API_URL}/get_sales`);
        const sales = await response.json();

        if (!sales || !Array.isArray(sales)) {
            console.error("Unexpected sales data:", sales);
            return;
        }

        const tableBody = document.getElementById("salesTable");
        tableBody.innerHTML = "";

        sales.forEach((sale, index) => {
            const productEntries = sale.products ? sale.products : [{
                product_name: sale.product_name || "N/A",
                quantity: sale.quantity || 1,
                price_per_unit: sale.price_per_unit || (sale.amount ? (sale.amount / (sale.quantity || 1)) : 0),
                total_amount: sale.amount || 0
            }];

            productEntries.forEach((product) => {
                // const pricePerUnit = product.price_per_unit || (product.total_amount ? (product.total_amount / product.quantity) : 0);
                console.log('product', product);
                // const pricePerUnit = (typeof product.price_per_unit === 'number' && !isNaN(product.price_per_unit)) 
                // ? product.price_per_unit 
                // : 0;
                const pricePerUnit = parseFloat(product.price_per_unit) || 0;
                const totalAmount = product.quantity * pricePerUnit;

                // const totalAmount = (product.quantity || 0) * pricePerUnit;

                const formattedDate = formatDate(sale.date);
                const row = `<tr>
                    <td>${index + 1}</td>
                    <td>${formattedDate || "N/A"}</td>
                    <td>${sale.customer_name || "N/A"}</td>
                    <td>${sale.village_name || "N/A"}</td>
                    <td>${sale.phone_no || "N/A"}</td>
                    <td>${product.product_name || "N/A"}</td>
                    <td>${product.quantity || 1}</td>
                    <td>${pricePerUnit.toFixed(2)}</td>
                    <td>${totalAmount.toFixed(2)}</td>
                    <td>${sale.grand_total || totalAmount}</td>
                </tr>`;
                tableBody.innerHTML += row;
            });
        });
        $('#salesTable').DataTable();
    } catch (error) {
        console.error("Error fetching sales:", error);
    }
}

loadSales();

// Add new product field dynamically
document.getElementById("addProduct").addEventListener("click", addProductField);

function addProductField() {
    const productContainer = document.getElementById("products");

    if (!productContainer) {
        console.error("Product container not found");
        return;
    }

    const productEntry = document.createElement("div");
    productEntry.classList.add("product-entry");

    productEntry.innerHTML = `
        <input type="text" class="product_name" placeholder="Product Name" required>
        <input type="number" class="quantity" placeholder="Quantity" required>
        <input type="number" class="price_per_unit" placeholder="Rate per Item" required>
        <input type="number" class="total_amount" placeholder="Total Amount" required readonly>
        <button type="button" class="remove-product">Remove</button>
    `;

    productContainer.appendChild(productEntry);

    // Attach event listeners to update total price
    productEntry.querySelector(".quantity").addEventListener("input", updateTotal);
    productEntry.querySelector(".price_per_unit").addEventListener("input", updateTotal);

    // Remove product button
    productEntry.querySelector(".remove-product").addEventListener("click", () => {
        productEntry.remove();
        updateGrandTotal(); // Update grand total after removal
    });

    updateGrandTotal(); // Ensure grand total updates after adding new product
}

// Automatically update total amount when quantity or price changes
function updateTotal(event) {
    const productDiv = event.target.closest(".product-entry");
    const quantity = parseFloat(productDiv.querySelector(".quantity").value) || 0;
    const price = parseFloat(productDiv.querySelector(".price_per_unit").value) || 0;
    productDiv.querySelector(".total_amount").value = (quantity * price).toFixed(2);

    updateGrandTotal(); // Update grand total when product total changes
}

// Function to calculate the grand total
function calculateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll(".total_amount").forEach(totalField => {
        grandTotal += parseFloat(totalField.value) || 0;
    });
    return grandTotal.toFixed(2);
}

// Function to update the grand total in the UI
function updateGrandTotal() {
    let total = 0;
    document.querySelectorAll('.total_amount').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('grand_total').value = total.toFixed(2);
}

// Function to format the date in MM/DD/YYYY format
function formatDate(dateString) {
    let date = new Date(dateString);  // Convert the string to a Date object
    let day = String(date.getDate()).padStart(2, '0');  // Add leading zero if necessary
    let month = String(date.getMonth() + 1).padStart(2, '0');  // Get month and pad it
    let year = date.getFullYear();  // Get the full year
    return `${day}/${month}/${year}`;  // Return formatted date
}

// Example of inserting formatted dates into a table
function insertDataToTable(data) {
    let table = document.getElementById("dataTable");
    let row = table.insertRow();

    // Assuming you have other data in the form of product name, price, and date
    let productNameCell = row.insertCell(0);
    let priceCell = row.insertCell(1);
    let dateCell = row.insertCell(2);

    productNameCell.textContent = data.productName;
    priceCell.textContent = data.price;
    dateCell.textContent = formatDate(data.date);  // Format the date before displaying
}

// Filter Functionality
function filterSales() {
    const dateFilter = document.getElementById("dateFilter").value.trim();
    const customerNameFilter = document.getElementById("customerNameFilter").value.trim().toLowerCase();

    const tableBody = document.getElementById("salesTable");
    const rows = tableBody.getElementsByTagName("tr");

    Array.from(rows).forEach(row => {
        const dateCell = row.cells[1].textContent.trim();
        const customerNameCell = row.cells[2].textContent.trim().toLowerCase();

        let match = true;

        if (dateFilter && !dateCell.includes(dateFilter)) {
            match = false;
        }

        if (customerNameFilter && !customerNameCell.includes(customerNameFilter)) {
            match = false;
        }

        if (match) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// document.getElementById("applyFilter").addEventListener("click", filterSales);

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("applyFilter").addEventListener("click", filterSales);
});

// Load existing sales on page load
loadSales();
addProductField(); // Ensure at least one product entry is present when the page loads
updateGrandTotal(); // Initialize grand total
