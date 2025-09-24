# backend/app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from io import BytesIO
import pandas as pd
import os
import traceback
import smtplib
from email.mime.text import MIMEText

# -------- CONFIG --------
ENABLE_EMAIL = False  # set True to actually send emails (use env vars in production)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = os.getenv("EMAIL_USER", "your_email@gmail.com")
EMAIL_PASS = os.getenv("EMAIL_PASS", "your_app_password")

# -------- APP --------
app = FastAPI(title="Student Risk API")

# allow React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# in-memory store (simple for a prototype)
_store: Dict[str, pd.DataFrame] = {}

# -------- Helpers --------
def _compute_marks_trend(marks_df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure marks_df has a 'marks_trend' column.
    Strategy (best-effort):
    1. If 'marks_trend' exists -> return untouched.
    2. If 'previous_marks' exists and 'marks' exists -> compare.
    3. If only 'marks' exists -> threshold heuristic: marks < 50 => 'down' else 'up'.
    4. Otherwise -> 'stable'.
    """
    df = marks_df.copy()
    if "marks_trend" in df.columns:
        return df

    if "marks" in df.columns and "previous_marks" in df.columns:
        def comp(r):
            try:
                if pd.isna(r["marks"]) or pd.isna(r["previous_marks"]):
                    return "stable"
                return "down" if float(r["marks"]) < float(r["previous_marks"]) else (
                    "up" if float(r["marks"]) > float(r["previous_marks"]) else "stable"
                )
            except Exception:
                return "stable"
        df["marks_trend"] = df.apply(comp, axis=1)
        return df

    if "marks" in df.columns:
        df["marks_trend"] = df["marks"].apply(lambda m: "down" if pd.notna(m) and float(m) < 50 else "up")
        return df

    df["marks_trend"] = "stable"
    return df

def _calculate_risk_row(row: Dict[str, Any]) -> str:
    """
    Mirror of your Streamlit calculate_risk but robust to missing values.
    """
    risk_score = 0
    # attendance
    try:
        att = row.get("attendance", None)
        if att is not None and not pd.isna(att) and float(att) < 75:
            risk_score += 1
    except Exception:
        pass

    # marks_trend
    try:
        if str(row.get("marks_trend", "")).lower() == "down":
            risk_score += 1
    except Exception:
        pass

    # fees_due
    try:
        fees = row.get("fees_due", None)
        if fees is not None and not pd.isna(fees) and float(fees) > 0:
            risk_score += 1
    except Exception:
        pass

    if risk_score >= 2:
        return "High"
    elif risk_score == 1:
        return "Medium"
    else:
        return "Low"

def _send_email(to_email: str, subject: str, body: str) -> None:
    if not ENABLE_EMAIL:
        return
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = to_email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as s:
            s.starttls()
            s.login(EMAIL_USER, EMAIL_PASS)
            s.sendmail(EMAIL_USER, to_email, msg.as_string())
    except Exception:
        # in production log properly
        traceback.print_exc()

# -------- Endpoints --------
@app.post("/upload-files")
async def upload_files(
    attendance: UploadFile = File(...),
    marks: UploadFile = File(...),
    fees: UploadFile = File(...),
):
    """
    Accepts 3 CSV files (attendance, marks, fees). Stores them in-memory for this session.
    """
    try:
        att_bytes = await attendance.read()
        marks_bytes = await marks.read()
        fees_bytes = await fees.read()

        att_df = pd.read_csv(BytesIO(att_bytes))
        marks_df = pd.read_csv(BytesIO(marks_bytes))
        fees_df = pd.read_csv(BytesIO(fees_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV(s): {e}")

    # Basic validation
    for df, name in [(att_df, "attendance"), (marks_df, "marks"), (fees_df, "fees")]:
        if "student_id" not in df.columns:
            raise HTTPException(status_code=400, detail=f"'{name}' CSV must contain column 'student_id'")

    # store
    _store["attendance"] = att_df
    _store["marks"] = marks_df
    _store["fees"] = fees_df

    return {"status": "ok", "message": "Files uploaded successfully"}

@app.get("/analyze")
def analyze():
    """
    Merge the uploaded files, ensure columns exist, compute marks_trend if needed,
    compute risk for each student and return records + counts.
    """
    if not all(k in _store for k in ("attendance", "marks", "fees")):
        raise HTTPException(status_code=400, detail="Please upload attendance, marks and fees files first.")

    att = _store["attendance"].copy()
    marks = _store["marks"].copy()
    fees = _store["fees"].copy()

    marks = _compute_marks_trend(marks)

    try:
        df = att.merge(marks, on="student_id", how="outer").merge(fees, on="student_id", how="outer")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging dataframes: {e}")

    # ensure safe columns
    if "attendance" not in df.columns:
        df["attendance"] = 100
    if "marks_trend" not in df.columns:
        df["marks_trend"] = "stable"
    if "fees_due" not in df.columns:
        df["fees_due"] = 0

    # compute risk
    df["risk"] = df.apply(lambda r: _calculate_risk_row(r.to_dict()), axis=1)

    # store result for optional endpoints
    _store["analysis_result"] = df

    records = df.fillna("").to_dict(orient="records")
    counts = df["risk"].value_counts().to_dict()
    return {"records": records, "counts": counts}

@app.post("/send-alerts")
def send_alerts():
    """
    Send email alerts for HIGH risk students (requires ENABLE_EMAIL=True and valid SMTP env vars).
    Returns number of alerts attempted.
    """
    if "analysis_result" not in _store:
        raise HTTPException(status_code=400, detail="No analysis result available. Call /analyze first.")

    df = _store["analysis_result"]
    high = df[df["risk"] == "High"]
    sent = 0
    for _, row in high.iterrows():
        to = row.get("mentor_email") or row.get("email") or None
        if not to:
            continue
        subject = f"⚠️ {row.get('name','Student')} is at HIGH dropout risk"
        body = f"Student {row.get('name','Student')} (ID: {row.get('student_id')}) is flagged as HIGH risk.\nAttendance: {row.get('attendance')}%\nMarks Trend: {row.get('marks_trend')}\nFees Due: {row.get('fees_due')}"
        _send_email(to, subject, body)
        sent += 1
    return {"high_risk_count": int(len(high)), "alerts_sent": int(sent)}