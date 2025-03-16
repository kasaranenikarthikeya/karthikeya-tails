from flask import Flask, render_template, request, jsonify, send_file
import psycopg2
import logging
import io
from openpyxl import Workbook

# Flask App
app = Flask(__name__,)

# PostgreSQL Connection
DATABASE_URL = "postgresql://my_flask_db_xrny_user:E5yWDOjujKIQmcqxTJU3OdmxQjZRarpb@dpg-cv7g2t2j1k6c73ed8330-a.oregon-postgres.render.com/my_flask_db_xrny"

# Function to Connect to DB
def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# 🚀 Ensure Table Exists
def setup_database():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Check if table exists
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales');")
    table_exists = cur.fetchone()[0]

    if not table_exists:
        cur.execute("""
            CREATE TABLE sales (
                serial_no SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                village_name VARCHAR(255),
                phone_no VARCHAR(20),
                product_name TEXT NOT NULL,
                quantity INT NOT NULL,
                price_per_unit DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
                grand_total DECIMAL(10,2) NOT NULL
            );
        """)
        print("✅ Table 'sales' created successfully!")

    conn.commit()
    cur.close()
    conn.close()

# 🚀 Serve HTML Page
@app.route('/')
def home():
    return render_template('index.html')

# 🚀 Fetch Sales Data
@app.route('/get_sales', methods=['GET'])
def get_sales():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT serial_no, date, customer_name, village_name, phone_no, product_name, 
               quantity, price_per_unit, total_amount, grand_total 
        FROM sales
    """)
    sales = cur.fetchall()
    
    cur.close()
    conn.close()
    
    sales_list = []
    for sale in sales:
        sales_list.append({
            'sno': sale[0],
            'date': sale[1],
            'customer_name': sale[2],
            'village_name': sale[3],
            'phone_no': sale[4],
            'product_name': sale[5],
            'quantity': sale[6],
            'price_per_unit': sale[7],
            'total_amount': sale[8],
            'grand_total': sale[9]
        })
    
    return jsonify(sales_list)

# 🚀 Add New Sale
logging.basicConfig(level=logging.DEBUG)

@app.route('/add_sale', methods=['POST'])
def add_sale():
    data = request.json
    logging.debug(f"Received data: {data}")  # Debugging log

    # Check if required fields exist
    required_fields = ['date', 'customer_name', 'village_name', 'phone_no', 'products', 'grand_total']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing value for {field}"}), 400

    # Loop through products list and insert each product
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        for product in data['products']:
            # Extract product details
            product_name = product.get('product_name')
            quantity = product.get('quantity')  # Fetch quantity from product
            rate = product.get('rate')          # Fetch rate from product
            
            # Validate that quantity and rate are present
            if not quantity or quantity <= 0:
                return jsonify({"error": "Missing or invalid quantity"}), 400
            if not rate or rate <= 0:
                return jsonify({"error": "Missing or invalid rate"}), 400

            # Convert to float (if necessary) and calculate total_amount
            quantity = float(quantity)
            rate = float(rate)
            total_amount = quantity * rate

            if not product_name:
                return jsonify({"error": "Missing value for product_name"}), 400

            # Insert the product sale into the sales table
            cur.execute("""
                INSERT INTO sales (date, customer_name, village_name, phone_no, product_name, quantity, price_per_unit, total_amount, grand_total)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (data['date'], data['customer_name'], data['village_name'], data['phone_no'], 
                  product_name, quantity, rate, total_amount, data['grand_total']))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "message": "Sale added successfully!"
        })

    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({"error": "An error occurred while processing the sale."}), 500

# 🚀 Export Sales Data as Excel
@app.route('/export', methods=['GET'])
def export_sales():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT serial_no, date, customer_name, village_name, phone_no, product_name, 
               quantity, price_per_unit, total_amount, grand_total 
        FROM sales
    """)
    sales = cur.fetchall()
    
    cur.close()
    conn.close()

    # Create a new workbook and add data to it
    wb = Workbook()
    ws = wb.active
    ws.append(['Serial No', 'Date', 'Customer Name', 'Village Name', 'Phone No', 'Product Name', 
               'Quantity', 'Price Per Unit', 'Total Amount', 'Grand Total'])  # Add header row

    for sale in sales:
        ws.append(sale)  # Add each row of sale data

    # Save the workbook to a byte stream
    excel_stream = io.BytesIO()
    wb.save(excel_stream)
    excel_stream.seek(0)

    # Send the Excel file to the user
    return send_file(
        excel_stream,
        as_attachment=True,
        download_name="sales_data.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

if __name__ == '__main__':
    setup_database()  
    app.run(debug=True)
