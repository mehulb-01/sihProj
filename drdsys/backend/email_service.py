from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import smtplib
from email.message import EmailMessage
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS from your React frontend (adjust the URL accordingly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmailData(BaseModel):
    sender_email: str
    sender_password: str
    recipients: list[str]
    subject: str
    body: str

@app.post("/send-email")
async def send_email(data: EmailData):
    try:
        msg = EmailMessage()
        msg["From"] = data.sender_email
        msg["To"] = ", ".join(data.recipients)
        msg["Subject"] = data.subject
        msg.set_content(data.body)

        # Gmail SMTP server (adjust for your email provider)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(data.sender_email, data.sender_password)
            server.send_message(msg)

        return {"status": "success", "message": "Emails sent."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
