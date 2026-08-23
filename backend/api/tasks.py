from celery import shared_task

@shared_task
def send_email_notification(to_email, subject, body):
    # Dummy implementation for sending email via SendGrid/Twilio/etc.
    print(f"Sending email to {to_email}: {subject}")
    return True

@shared_task
def send_sms_notification(phone_number, message):
    # Dummy implementation for sending SMS via Twilio
    if not phone_number:
        return False
    print(f"Sending SMS to {phone_number}: {message}")
    return True
