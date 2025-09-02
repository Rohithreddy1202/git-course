from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import uuid
import random
import string
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message

# --- Load Environment Variables ---
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- SECURE: Email Configuration from Environment Variables ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

DATABASE = 'hrms.db'

# --- Database Initialization and Helper Functions ---
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Employee Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, gender TEXT, dob TEXT,
            permanent_address TEXT, current_address TEXT, pan_number TEXT,
            aadhar_number TEXT, contactnumber TEXT, alternate_contact_number TEXT,
            alternate_contact_person TEXT, alternate_contact_relation TEXT,
            emergency_number TEXT, account_number TEXT, ifsc_code TEXT,
            account_holder_name TEXT, branch TEXT, department TEXT,
            reporting_manager1 TEXT, reporting_manager1_mail TEXT,
            reporting_manager2 TEXT, reporting_manager2_mail TEXT,
            employee_role TEXT, employment_status TEXT, join_date TEXT,
            user_type TEXT NOT NULL DEFAULT 'employee'
        )
    ''')
    # Attendance Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance_records (
            record_id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, date TEXT NOT NULL,
            login_time TEXT NOT NULL, work_location TEXT, logout_time TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    ''')
    # Notifications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            notification_id TEXT PRIMARY KEY, employee_id TEXT NOT NULL,
            message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    ''')
    # Leave Applications Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leave_applications (
            record_id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            leave_type TEXT NOT NULL,
            from_date TEXT NOT NULL,
            to_date TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        )
    ''')
    conn.commit()
    conn.close()

def create_notification(conn, employee_id, message):
    try:
        cursor = conn.cursor()
        notification_id = str(uuid.uuid4())
        cursor.execute(
            'INSERT INTO notifications (notification_id, employee_id, message) VALUES (?, ?, ?)',
            (notification_id, employee_id, message)
        )
    except sqlite3.Error as e:
        print(f"Database error creating notification: {e}")

with app.app_context():
    init_db()

# --- API Endpoints ---
@app.route('/register', methods=['POST'])
def register_employee():
    data = request.get_json()
    required_fields = ["first_name", "last_name", "email", "password"]
    if not all(field in data for field in required_fields):
        return jsonify({"message": "Missing required fields"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email FROM employees WHERE email = ?", (data['email'],))
        if cursor.fetchone():
            return jsonify({"message": "Email already exists"}), 409
        cursor.execute("SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) FROM employees WHERE id LIKE 'SSQ-%'")
        last_id_num = cursor.fetchone()[0]
        new_id_num = (last_id_num if last_id_num else 1000) + 1
        new_id = f"SSQ-{new_id_num}"
        hashed_password = generate_password_hash(data['password'])
        cursor.execute('''
            INSERT INTO employees (id, first_name, last_name, email, password, gender, dob,
                permanent_address, current_address, pan_number, aadhar_number,
                contactnumber, alternate_contact_number, alternate_contact_person,
                alternate_contact_relation, emergency_number, account_number,
                ifsc_code, account_holder_name, branch, department,
                reporting_manager1, reporting_manager1_mail,
                reporting_manager2, reporting_manager2_mail,
                employee_role, employment_status, join_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            new_id, data['first_name'], data['last_name'], data['email'], hashed_password,
            data.get('gender'), data.get('dob'), data.get('permanent_address'),
            data.get('current_address'), data.get('pan_number'), data.get('aadhar_number'),
            data.get('contactnumber'), data.get('alternate_contact_number'),
            data.get('alternate_contact_person'), data.get('alternate_contact_relation'),
            data.get('emergency_number'), data.get('account_number'), data.get('ifsc_code'),
            data.get('account_holder_name'), data.get('branch'), data.get('department'),
            data.get('reporting_manager1'), data.get('reporting_manager1_mail'),
            data.get('reporting_manager2'), data.get('reporting_manager2_mail'),
            data.get('employee_role'), data.get('employment_status'), data.get('join_date')
        ))
        conn.commit()
        return jsonify({"message": "Registration successful!", "id": new_id}), 201
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login_employee():
    ADMIN_EMAIL = "admin@gmail.com"
    ADMIN_PASSWORD = "123"

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type') # Get the user type from the request

    if not all([username, password, user_type]):
        return jsonify({"message": "Email, password, and user_type are required"}), 400

    # Admin Login Logic
    if user_type == 'admin':
        if username == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            admin_user = {
                "id": "ADMIN-001",
                "first_name": "Admin",
                "last_name": "User",
                "email": ADMIN_EMAIL,
                "user_type": "admin"
            }
            return jsonify({"message": "Admin login successful!", "user": admin_user}), 200
        else:
            # If admin credentials fail, do not check employee DB.
            return jsonify({"message": "Invalid Admin credentials"}), 401

    # Employee Login Logic
    elif user_type == 'employee':
        # Do not allow admin to log in via the employee form
        if username == ADMIN_EMAIL:
                return jsonify({"message": "Invalid employee credentials"}), 401

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees WHERE email = ?", (username,))
        employee = cursor.fetchone()
        conn.close()

        if employee and check_password_hash(employee['password'], password):
            employee_dict = dict(employee)
            employee_dict.pop('password', None)
            return jsonify({"message": "Login successful!", "user": employee_dict}), 200
        else:
            return jsonify({"message": "Invalid employee credentials"}), 401
    
    # Fallback for invalid user_type
    else:
        return jsonify({"message": "Invalid user type specified"}), 400


@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"message": "Email is required"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE email = ?", (email,))
    employee = cursor.fetchone()
    if employee:
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        hashed_new_password = generate_password_hash(new_password)
        try:
            cursor.execute("UPDATE employees SET password = ? WHERE email = ?", (hashed_new_password, email))
            create_notification(conn, employee['id'], "Your password was reset via email request.")
            conn.commit()
            msg = Message('Your HRMS Password has been Reset', recipients=[email])
            msg.body = f"""Hello {employee['first_name']},
            Your password for the HRMS portal has been reset.
            Your new temporary password is: {new_password}
            Please log in with this password and change it immediately from the 'Change Password' section.
            Thank you,
            HRMS System"""
            mail.send(msg)
            return jsonify({"message": "A new password has been sent to your email address."}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"message": f"Failed to reset password. Error: {e}"}), 500
        finally:
            conn.close()
    else:
        conn.close()
        return jsonify({"message": "If an account with that email exists, a new password has been sent."}), 200

@app.route('/profile/change-password/<string:employee_id>', methods=['PUT'])
def change_password(employee_id):
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    if not all([old_password, new_password]):
        return jsonify({"message": "Old and new passwords are required"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
        employee = cursor.fetchone()
        if not employee:
            return jsonify({"message": "Employee not found"}), 404
        if not check_password_hash(employee['password'], old_password):
            return jsonify({"message": "Incorrect old password"}), 400
        hashed_new_password = generate_password_hash(new_password)
        cursor.execute("UPDATE employees SET password = ? WHERE id = ?", (hashed_new_password, employee_id))
        create_notification(conn, employee_id, "Your password was changed successfully.")
        conn.commit()
        return jsonify({"message": "Password updated successfully!"}), 200
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()

@app.route('/profile/reset-password-internal/<string:employee_id>', methods=['PUT'])
def reset_password_internal(employee_id):
    data = request.get_json()
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({"message": "New password is required"}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
        employee = cursor.fetchone()
        if not employee:
            return jsonify({"message": "Employee not found"}), 404
        hashed_new_password = generate_password_hash(new_password)
        cursor.execute("UPDATE employees SET password = ? WHERE id = ?", (hashed_new_password, employee_id))
        create_notification(conn, employee_id, "Your password was reset from within your session.")
        conn.commit()
        return jsonify({"message": "Password reset successfully!"}), 200
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()

@app.route('/profile/<string:employee_id>', methods=['GET'])
def get_employee_profile(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
    employee = cursor.fetchone()
    conn.close()
    if employee:
        employee_dict = dict(employee)
        employee_dict.pop('password', None)
        return jsonify(employee_dict), 200
    else:
        return jsonify({"message": "Employee not found"}), 404

@app.route('/profile/<string:employee_id>', methods=['PUT'])
def update_employee_profile(employee_id):
    data = request.get_json()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Employee not found"}), 404
        set_clauses = []
        update_values = []
        for key, value in data.items():
            if key not in ['id', 'email', 'password']:
                set_clauses.append(f"{key} = ?")
                update_values.append(value)
        if not set_clauses:
            return jsonify({"message": "No valid fields to update"}), 400
        update_query = f"UPDATE employees SET {', '.join(set_clauses)} WHERE id = ?"
        update_values.append(employee_id)
        cursor.execute(update_query, tuple(update_values))
        create_notification(conn, employee_id, "Your profile details have been updated.")
        conn.commit()
        cursor.execute("SELECT * FROM employees WHERE id = ?", (employee_id,))
        updated_employee = cursor.fetchone()
        updated_employee_dict = dict(updated_employee)
        updated_employee_dict.pop('password', None)
        return jsonify({"message": "Profile updated successfully!", "user": updated_employee_dict}), 200
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()
        
@app.route('/notifications/<string:employee_id>', methods=['GET'])
def get_notifications(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT message, is_read FROM notifications WHERE employee_id = ? ORDER BY timestamp DESC",
        (employee_id,)
    )
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(notifications), 200

@app.route('/notifications/mark-read/<string:employee_id>', methods=['PUT'])
def mark_notifications_as_read(employee_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND is_read = 0",
            (employee_id,)
        )
        conn.commit()
        return jsonify({"message": f"{cursor.rowcount} notifications marked as read."}), 200
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()

# --- NEW: Leave Application Endpoints ---
@app.route('/leave-application', methods=['POST'])
def submit_leave_application():
    data = request.get_json()
    employee_id = data.get('employee_id')
    leave_type = data.get('leave_type')
    from_date = data.get('from_date')
    to_date = data.get('to_date')
    description = data.get('description')

    if not all([employee_id, leave_type, from_date]):
        return jsonify({"message": "Missing required fields for leave application"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        record_id = str(uuid.uuid4())
        cursor.execute(
            '''INSERT INTO leave_applications (record_id, employee_id, leave_type, from_date, to_date, description)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (record_id, employee_id, leave_type, from_date, to_date, description)
        )
        create_notification(conn, employee_id, f"Your request for {leave_type} has been submitted.")
        conn.commit()
        return jsonify({"message": f"{leave_type} application submitted successfully!"}), 201
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error: {e}"}), 500
    finally:
        conn.close()

@app.route('/leave-applications/<string:employee_id>', methods=['GET'])
def get_leave_applications(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM leave_applications WHERE employee_id = ? ORDER BY submitted_at DESC",
        (employee_id,)
    )
    applications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(applications), 200

# --- Attendance Endpoints ---
@app.route('/attendance/login', methods=['POST'])
def attendance_login():
    data = request.get_json()
    employee_id, date_str, work_location, employee_name = data.get('employee_id'), data.get('date'), data.get('work_location'), data.get('employee_name')
    if not all([employee_id, date_str, work_location, employee_name]):
        return jsonify({"message": "Missing required attendance login fields"}), 400
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        record_id = str(uuid.uuid4())
        login_time = datetime.now().strftime('%H:%M:%S')
        cursor.execute('INSERT INTO attendance_records (record_id, employee_id, date, login_time, work_location) VALUES (?, ?, ?, ?, ?)',
                       (record_id, employee_id, date_str, login_time, work_location))
        conn.commit()
        return jsonify({"message": "Login recorded successfully!", "record": {"record_id": record_id, "employee_id": employee_id, "date": date_str, "login_time": login_time, "employee_name": employee_name, "work_location": work_location, "logout_time": None}}), 201
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error recording login: {e}"}), 500
    finally:
        conn.close()

@app.route('/attendance/logout/<string:record_id>', methods=['PUT'])
def attendance_logout(record_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        logout_time = datetime.now().strftime('%H:%M:%S')
        cursor.execute("UPDATE attendance_records SET logout_time = ? WHERE record_id = ? AND logout_time IS NULL", (logout_time, record_id))
        if cursor.rowcount == 0:
            return jsonify({"message": "Attendance record not found or already logged out"}), 404
        conn.commit()
        return jsonify({"message": "Logout recorded successfully!", "logout_time": logout_time}), 200
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"message": f"Database error recording logout: {e}"}), 500
    finally:
        conn.close()

@app.route('/attendance/<string:employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''SELECT ar.record_id, ar.date, ar.login_time, ar.work_location, ar.logout_time, e.first_name, e.last_name
                      FROM attendance_records ar JOIN employees e ON ar.employee_id = e.id
                      WHERE ar.employee_id = ? ORDER BY ar.date DESC, ar.login_time DESC''', (employee_id,))
    records = cursor.fetchall()
    conn.close()
    attendance_list = []
    for record in records:
        record_dict = dict(record)
        record_dict['employee_name'] = f"{record_dict.pop('first_name')} {record_dict.pop('last_name')}"
        attendance_list.append(record_dict)
    return jsonify(attendance_list), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)