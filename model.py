import streamlit as st
import pandas as pd
import smtplib
from email.mime.text import MIMEText

# -------------------------
# CONFIG
# -------------------------
ENABLE_EMAIL = False  # set to True if you want email alerts
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "your_email@gmail.com"
EMAIL_PASS = "your_app_password"  # Use App Password if Gmail

# -------------------------
# RISK LOGIC
# -------------------------
def calculate_risk(row):
    risk_score = 0
    if row['attendance'] < 75:
        risk_score += 1
    if row['marks_trend'].lower() == "down":
        risk_score += 1
    if row['fees_due'] > 0:
        risk_score += 1
    if risk_score >= 2:
        return "High"
    elif risk_score == 1:
        return "Medium"
    else:
        return "Low"

# -------------------------
# EMAIL ALERTS
# -------------------------
def send_email(to_email, subject, message):
    try:
        msg = MIMEText(message)
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = to_email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
    except Exception as e:
        st.error(f"Email failed: {e}")

# -------------------------
# MODERN DARK LOGIN PANEL
# -------------------------
def login_page():
    st.markdown("""
        <style>
        .login-container {
            background: #1a202c;
            border-radius: 16px;
            box-shadow: 0 8px 32px 0 #0000003a;
            padding: 36px 32px 30px 32px;
            max-width: 380px;
            margin: 60px auto 16px auto;
            color: #f0f6fc;
        }
        .login-logo {
            text-align: center;
            margin-bottom: 0.7em;
        }
        .login-title {
            text-align: center;
            font-size: 1.75em;
            letter-spacing: 0.02em;
            font-weight: bold;
            margin-bottom: 0.8em;
        }
        .stTextInput>div>div>input {
            background-color: #232833;
            color: #f0f6fc;
            border-radius: 7px;
            border: 1px solid #3c475c;
        }
        .stButton>button {
            background-color: #2563eb;
            color: #f0f6fc;
            border-radius: 6px;
            border: none;
            font-weight: 500;
            padding: 8px 0px;
        }
        </style>
    """, unsafe_allow_html=True)
    st.markdown('<div class="login-container">', unsafe_allow_html=True)
    st.markdown('<div class="login-logo"><span style="font-size:2.8em;">🔒</span></div>', unsafe_allow_html=True)
    st.markdown('<div class="login-title">Student Portal Login</div>', unsafe_allow_html=True)

    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        if st.form_submit_button("Login"):
            if username.strip() == "" or password.strip() == "":
                st.error("Please provide both username and password! 🚫")
            else:
                st.session_state['logged_in'] = True
                st.session_state['username'] = username

                # ✅ Correct new way
                st.query_params["logged_in"] = "true"
                st.query_params["username"] = username

                st.success(f"Logged in as {username}")
                st.rerun()


    st.markdown('</div>', unsafe_allow_html=True)

    with st.expander("Don't have an account? Register here"):
        with st.form("registration_form", clear_on_submit=True):
            new_username = st.text_input("Choose a username")
            new_password = st.text_input("Choose a password", type="password")
            confirm_password = st.text_input("Confirm password", type="password")
            if st.form_submit_button("Register"):
                if (
                    new_username.strip() == "" or
                    new_password.strip() == "" or
                    confirm_password.strip() == ""
                ):
                    st.error("All fields required for registration! 🚫")
                elif new_password != confirm_password:
                    st.error("Passwords do not match! 🚫")
                else:
                    st.success(f"Account '{new_username}' registered! You can now log in.")

# ---------------------------
# USER SIDEBAR PANEL
# ---------------------------
def user_panel():
    st.sidebar.title("👤 User Panel")
    username = st.session_state.get('username', 'Guest')
    st.sidebar.markdown(f"**Logged in as:** {username}")

    if st.sidebar.button("Logout"):
        st.session_state.clear()
        st.query_params.clear()
        st.success("Logged out successfully!")
        st.stop()

    st.sidebar.markdown("---")
    st.sidebar.subheader("Manage Files:")

    attendance_file = st.sidebar.file_uploader("Upload Attendance CSV", type=['csv'], key='att_file')
    marks_file = st.sidebar.file_uploader("Upload Marks CSV", type=['csv'], key='marks_file')
    fees_file = st.sidebar.file_uploader("Upload Fees CSV", type=['csv'], key='fees_file')

    if attendance_file is not None:
        st.session_state['attendance'] = pd.read_csv(attendance_file)
    if marks_file is not None:
        st.session_state['marks'] = pd.read_csv(marks_file)
    if fees_file is not None:
        st.session_state['fees'] = pd.read_csv(fees_file)

    files = {
        "Attendance CSV": st.session_state.get('attendance'),
        "Marks CSV": st.session_state.get('marks'),
        "Fees CSV": st.session_state.get('fees')
    }

    st.sidebar.markdown("**Uploaded Files (Folder View):**")
    if any(df is not None for df in files.values()):
        for file_name, df in files.items():
            if df is not None:
                with st.sidebar.expander(file_name, expanded=False):
                    st.write(df.head())
                    if st.button(f"Reload {file_name}", key=f"reload_{file_name}"):
                        st.session_state['selected_file'] = file_name
                        st.success(f"{file_name} reloaded and ready for dashboard")
        if st.sidebar.button("Clear All Files"):
            for key in ['attendance', 'marks', 'fees']:
                if key in st.session_state:
                    del st.session_state[key]
            st.sidebar.success("All uploaded files cleared!")
    else:
        st.sidebar.info("No files uploaded yet.")

    st.session_state['files_uploaded'] = all(df is not None for df in files.values())

# -------------------------
# DASHBOARD
# -------------------------
def dashboard():
    st.title("📊 Student Dropout Risk Dashboard")
    attendance = st.session_state.get('attendance')
    marks = st.session_state.get('marks')
    fees = st.session_state.get('fees')

    if attendance is None or marks is None or fees is None:
        st.error("Missing data! Please upload all required files from the user panel on the left.")
        return

    try:
        df = attendance.merge(marks, on="student_id").merge(fees, on="student_id")
    except Exception as e:
        st.error(f"Error merging data: {e}")
        return

    df['risk'] = df.apply(calculate_risk, axis=1)

    def highlight_risk(val):
        if val == "High":
            return "background-color: red; color: white"
        elif val == "Medium":
            return "background-color: orange"
        elif val == "Low":
            return "background-color: lightgreen"
        return ""

    st.dataframe(df.style.map(highlight_risk, subset=["risk"]))

    risk_counts = df['risk'].value_counts()
    st.bar_chart(risk_counts)

    if ENABLE_EMAIL:
        st.subheader("📧 Sending Alerts...")
        for _, row in df.iterrows():
            if row['risk'] == "High":
                send_email(
                    row['mentor_email'],
                    f"⚠️ {row['name']} is at HIGH dropout risk",
                    f"Student {row['name']} (ID: {row['student_id']}) is flagged as HIGH risk.\n"
                    f"Attendance: {row['attendance']}%\nMarks Trend: {row['marks_trend']}\nFees Due: {row['fees_due']}"
                )
        st.success("High-risk student alerts sent!")

# -------------------------
# APP ENTRY POINT
# -------------------------
def main():
    query_params = st.query_params

    if query_params.get("logged_in") == "true":
        st.session_state['logged_in'] = True
        st.session_state['username'] = query_params.get("username", "")

    if 'logged_in' not in st.session_state:
        st.session_state['logged_in'] = False
    if 'files_uploaded' not in st.session_state:
        st.session_state['files_uploaded'] = False

    if not st.session_state['logged_in']:
        login_page()
    else:
        user_panel()
        if st.session_state['files_uploaded']:
            dashboard()
        else:
            st.info("Please upload all three required files from the user panel on the left to view the dashboard.")

if __name__ == "__main__":
    main()
