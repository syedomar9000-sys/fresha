from datetime import datetime, timedelta, date, time
import pytz
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.conf import settings
import stripe
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Business, Service, StaffMember, ServiceCategory, StaffAvailability, Appointment, Review

User = get_user_model()

class AuthService:
    @staticmethod
    def signup(username, email, password, first_name='', last_name='', role='CUSTOMER'):
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role
        )
        if role == 'BUSINESS_OWNER':
            Business.objects.create(owner=user, name=f"{username}'s Business")
        return user

    @staticmethod
    def get_tokens_for_user(user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

class BusinessManagementService:
    @staticmethod
    def create_business(user, **kwargs):
        if user.role not in ['BUSINESS_OWNER', 'BUSINESS']:
            raise PermissionDenied("Only business owners can create a business.")
        return Business.objects.create(owner=user, **kwargs)

    @staticmethod
    def update_business(user, business_id, **kwargs):
        business = Business.objects.get(id=business_id)
        if business.owner != user:
            raise PermissionDenied("You do not own this business.")
        for k, v in kwargs.items():
            setattr(business, k, v)
        business.save()
        return business

class ServiceManagementService:
    @staticmethod
    def create_service(user, business_id, **kwargs):
        business = Business.objects.get(id=business_id)
        if business.owner != user:
            raise PermissionDenied("You do not own this business.")
        
        category_name = kwargs.pop('category', 'General')
        category, _ = ServiceCategory.objects.get_or_create(business=business, name=category_name)
        
        service = Service.objects.create(category=category, **kwargs)
        return service

    @staticmethod
    def update_service(user, service_id, **kwargs):
        service = Service.objects.select_related('category__business').get(id=service_id)
        if service.category.business.owner != user:
            raise PermissionDenied("You do not own this service.")
            
        category_name = kwargs.pop('category', None)
        if category_name:
            category, _ = ServiceCategory.objects.get_or_create(business=service.category.business, name=category_name)
            service.category = category

        for k, v in kwargs.items():
            setattr(service, k, v)
        service.save()
        return service

    @staticmethod
    def soft_delete_service(user, service_id):
        service = Service.objects.select_related('category__business').get(id=service_id)
        if service.category.business.owner != user:
            raise PermissionDenied("You do not own this service.")
        service.is_active = False
        service.save()
        return service

class StaffManagementService:
    @staticmethod
    @transaction.atomic
    def create_staff(user, business_id, availabilities=None, services=None, **kwargs):
        business = Business.objects.get(id=business_id)
        if business.owner != user:
            raise PermissionDenied("You do not own this business.")
        
        staff = StaffMember.objects.create(business=business, **kwargs)
        if services:
            staff.services.set(services)
            
        if availabilities:
            for av in availabilities:
                StaffAvailability.objects.create(
                    staff_member=staff,
                    day_of_week=av['day_of_week'],
                    start_time=av['start_time'],
                    end_time=av['end_time']
                )
        return staff

    @staticmethod
    @transaction.atomic
    def update_staff(user, staff_id, availabilities=None, services=None, **kwargs):
        staff = StaffMember.objects.select_related('business').get(id=staff_id)
        if staff.business.owner != user:
            raise PermissionDenied("You do not own this staff member.")
            
        for k, v in kwargs.items():
            setattr(staff, k, v)
        staff.save()
        
        if services is not None:
            staff.services.set(services)
            
        if availabilities is not None:
            staff.availabilities.all().delete()
            for av in availabilities:
                StaffAvailability.objects.create(
                    staff_member=staff,
                    day_of_week=av['day_of_week'],
                    start_time=av['start_time'],
                    end_time=av['end_time']
                )
        return staff

    @staticmethod
    def deactivate_staff(user, staff_id):
        staff = StaffMember.objects.select_related('business').get(id=staff_id)
        if staff.business.owner != user:
            raise PermissionDenied("You do not own this staff member.")
        staff.is_active = False
        staff.save()
        return staff

class AvailabilityService:
    @staticmethod
    def get_available_slots(service_id, target_date_str, staff_id=None):
        try:
            service = Service.objects.select_related('category__business').get(id=service_id, is_active=True)
        except Service.DoesNotExist:
            return []
            
        business = service.category.business
        tz = pytz.timezone(business.timezone or 'UTC')
        
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        day_of_week = target_date.weekday() # 0 = Monday, 6 = Sunday
        
        # 1. Fetch relevant staff and their availability
        staff_qs = StaffMember.objects.filter(
            business=business, 
            is_active=True, 
            services=service,
            availabilities__day_of_week=day_of_week
        ).prefetch_related('availabilities')
        
        if staff_id:
            staff_qs = staff_qs.filter(id=staff_id)
            
        staff_list = list(staff_qs)
        if not staff_list:
            return []
            
        staff_ids = [s.id for s in staff_list]
        
        # 2. Fetch existing appointments for the day
        # Compute UTC bounds for the target day in business timezone
        local_start_of_day = tz.localize(datetime.combine(target_date, time.min))
        local_end_of_day = tz.localize(datetime.combine(target_date, time.max))
        
        # Exclude CANCELLED and expired PENDING_PAYMENT (older than 15 minutes)
        expiration_time = timezone.now() - timedelta(minutes=15)
        appointments = Appointment.objects.filter(
            staff_member_id__in=staff_ids,
            start_time__gte=local_start_of_day.astimezone(pytz.UTC),
            start_time__lte=local_end_of_day.astimezone(pytz.UTC)
        ).exclude(status='CANCELLED').exclude(
            status='PENDING_PAYMENT', created_at__lt=expiration_time
        )
        
        # Group appointments by staff_id for efficient checking
        apps_by_staff = {sid: [] for sid in staff_ids}
        for app in appointments:
            # Convert app times to local business time for easy comparison
            local_app_start = app.start_time.astimezone(tz).time()
            local_app_end = app.end_time.astimezone(tz).time()
            apps_by_staff[app.staff_member_id].append((local_app_start, local_app_end))
            
        # 3. Generate slots
        duration = timedelta(minutes=service.duration_minutes)
        slots = []
        
        local_now = timezone.now().astimezone(tz)
        
        for staff in staff_list:
            avail = next((a for a in staff.availabilities.all() if a.day_of_week == day_of_week), None)
            if not avail:
                continue
                
            current_dt = datetime.combine(target_date, avail.start_time)
            end_dt = datetime.combine(target_date, avail.end_time)
            
            while current_dt + duration <= end_dt:
                slot_start_time = current_dt.time()
                slot_end_time = (current_dt + duration).time()
                
                # Skip if the slot is in the past
                if target_date == local_now.date() and current_dt < local_now.replace(tzinfo=None):
                    current_dt += timedelta(minutes=15)
                    continue
                
                # Check for overlap
                conflict = False
                for app_start, app_end in apps_by_staff[staff.id]:
                    # Overlap happens if slot start is strictly before app end AND slot end is strictly after app start
                    if slot_start_time < app_end and slot_end_time > app_start:
                        conflict = True
                        break
                        
                if not conflict:
                    slots.append({
                        'staff_id': staff.id,
                        'staff_name': f"{staff.first_name} {staff.last_name}",
                        'start_time': slot_start_time.strftime('%H:%M'),
                        'end_time': slot_end_time.strftime('%H:%M')
                    })
                    
                # Increment by 15 mins
                current_dt += timedelta(minutes=15)
                
        # Sort slots by time
        slots.sort(key=lambda x: x['start_time'])
        return slots

class AppointmentManagementService:
    @staticmethod
    @transaction.atomic
    def create_appointment(user, service_id, staff_id, date_str, start_time_str, notes=''):
        # 1. Fetch relations and validate
        service = Service.objects.select_related('category__business').get(id=service_id)
        business = service.category.business
        
        # 2. Reject bookings in the past
        tz = pytz.timezone(business.timezone or 'UTC')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        target_time = datetime.strptime(start_time_str, '%H:%M').time()
        
        local_start_dt = tz.localize(datetime.combine(target_date, target_time))
        utc_start_dt = local_start_dt.astimezone(pytz.UTC)
        
        if utc_start_dt < timezone.now():
            raise ValidationError("Cannot book appointments in the past.")
            
        duration = timedelta(minutes=service.duration_minutes)
        utc_end_dt = (local_start_dt + duration).astimezone(pytz.UTC)

        # 3. Lock staff member for concurrency safety
        try:
            staff = StaffMember.objects.select_for_update().get(id=staff_id, business=business, is_active=True)
        except StaffMember.DoesNotExist:
            raise ValidationError("Staff member does not exist or does not belong to the business.")
            
        if not staff.services.filter(id=service_id).exists():
            raise ValidationError("Staff member does not provide this service.")

        # 4. Check for double booking (conflicts)
        from django.db.models import Q
        expiration_time = timezone.now() - timedelta(minutes=15)
        conflicts = Appointment.objects.filter(
            staff_member=staff,
            start_time__lt=utc_end_dt,
            end_time__gt=utc_start_dt
        ).filter(
            Q(status__in=['PENDING', 'CONFIRMED']) |
            Q(status='PENDING_PAYMENT', created_at__gte=expiration_time)
        ).exists()
        
        if conflicts:
            raise ValidationError("This time slot is no longer available.")
            
        # 5. Determine initial status
        if service.price == 0:
            initial_status = 'CONFIRMED'
            payment_status = 'PAID'
        else:
            initial_status = 'PENDING_PAYMENT'
            payment_status = 'UNPAID'
            
        # 6. Create booking
        appointment = Appointment.objects.create(
            customer=user,
            service=service,
            staff_member=staff,
            start_time=utc_start_dt,
            end_time=utc_end_dt,
            notes=notes,
            status=initial_status,
            payment_status=payment_status
        )
        
        # Trigger Notification
        from .tasks import send_email_notification
        send_email_notification.delay(
            to_email=user.email,
            subject=f"Booking created: {service.name}",
            body=f"Your booking for {service.name} at {business.name} is {initial_status}."
        )
        
        return appointment

    @staticmethod
    def cancel_appointment(user, appointment_id):
        appointment = Appointment.objects.select_related('service__category__business', 'customer').get(id=appointment_id)
        business = appointment.service.category.business
        if appointment.customer != user and business.owner != user:
            raise PermissionDenied("You do not have permission to cancel this appointment.")
            
        if appointment.status != 'CANCELLED':
            appointment.status = 'CANCELLED'
            appointment.save(update_fields=['status'])
            
            # Process refund if paid
            if appointment.payment_status in ['PAID', 'DEPOSIT_PAID'] and appointment.stripe_checkout_session_id:
                try:
                    stripe.api_key = settings.STRIPE_SECRET_KEY
                    session = stripe.checkout.Session.retrieve(appointment.stripe_checkout_session_id)
                    if session.payment_intent:
                        stripe.Refund.create(payment_intent=session.payment_intent)
                except Exception as e:
                    print(f"Refund failed: {e}")
            
            # Trigger Notification
            from .tasks import send_email_notification
            send_email_notification.delay(
                to_email=appointment.customer.email,
                subject=f"Booking cancelled: {appointment.service.name}",
                body=f"Your booking for {appointment.service.name} at {business.name} has been cancelled."
            )
            
        return appointment

    @staticmethod
    def confirm_appointment(user, appointment_id):
        appointment = Appointment.objects.select_related('service__category__business').get(id=appointment_id)
        business = appointment.service.category.business
        if business.owner != user:
            raise PermissionDenied("Only the business owner can confirm appointments.")
            
        if appointment.status == 'PENDING' or appointment.status == 'PENDING_PAYMENT':
            appointment.status = 'CONFIRMED'
            appointment.save(update_fields=['status'])
            
            # Trigger Notification
            from .tasks import send_email_notification
            send_email_notification.delay(
                to_email=appointment.customer.email,
                subject=f"Booking confirmed: {appointment.service.name}",
                body=f"Your booking for {appointment.service.name} at {business.name} is confirmed."
            )
            
        return appointment

class PaymentService:
    @staticmethod
    def create_checkout_session(user, appointment_id, success_url, cancel_url):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        appointment = Appointment.objects.select_related('service__category__business').get(id=appointment_id)
        
        if appointment.customer != user:
            raise PermissionDenied("You can only pay for your own appointments.")
            
        if appointment.payment_status in ['PAID', 'DEPOSIT_PAID']:
            raise ValidationError("This appointment is already paid.")
            
        service = appointment.service
        business = service.category.business
        
        amount_to_pay = service.deposit if service.deposit > 0 else service.price
        amount_cents = int(amount_to_pay * 100)
        
        session_kwargs = {
            'payment_method_types': ['card'],
            'line_items': [{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{service.name} at {business.name}",
                    },
                    'unit_amount': amount_cents,
                },
                'quantity': 1,
            }],
            'mode': 'payment',
            'success_url': success_url,
            'cancel_url': cancel_url,
            'client_reference_id': str(appointment.id),
        }
        
        if business.stripe_onboarding_complete and business.stripe_account_id:
            # Route payment to connected account, take 5% application fee
            fee_cents = int(amount_cents * 0.05)
            session_kwargs['payment_intent_data'] = {
                'application_fee_amount': fee_cents,
                'transfer_data': {
                    'destination': business.stripe_account_id,
                },
            }
            
        session = stripe.checkout.Session.create(**session_kwargs)
        appointment.stripe_checkout_session_id = session.id
        appointment.save(update_fields=['stripe_checkout_session_id'])
        
        return session.url

    @staticmethod
    def handle_payment_webhook(payload, sig_header):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            raise ValidationError("Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            raise ValidationError("Invalid signature")

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            appointment_id = session.get('client_reference_id')
            
            if appointment_id:
                try:
                    appointment = Appointment.objects.select_related('service').get(id=appointment_id)
                    # Idempotency check: Don't double confirm
                    if appointment.payment_status == 'UNPAID':
                        if appointment.service.deposit > 0:
                            appointment.payment_status = 'DEPOSIT_PAID'
                        else:
                            appointment.payment_status = 'PAID'
                        
                        appointment.status = 'CONFIRMED'
                        appointment.save(update_fields=['payment_status', 'status'])
                except Appointment.DoesNotExist:
                    pass
        return True

class ConnectService:
    @staticmethod
    def create_onboarding_link(user, business_id, return_url, refresh_url):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        business = Business.objects.get(id=business_id)
        
        if business.owner != user:
            raise PermissionDenied("Only the business owner can connect Stripe.")
            
        if not business.stripe_account_id:
            account = stripe.Account.create(type='express')
            business.stripe_account_id = account.id
            business.save(update_fields=['stripe_account_id'])
            
        account_link = stripe.AccountLink.create(
            account=business.stripe_account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type='account_onboarding',
        )
        return account_link.url

    @staticmethod
    def get_connect_status(user, business_id):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        business = Business.objects.get(id=business_id)
        
        if business.owner != user:
            raise PermissionDenied("Only the business owner can view Stripe status.")
            
        if not business.stripe_account_id:
            return {'isConnected': False, 'detailsSubmitted': False}
            
        account = stripe.Account.retrieve(business.stripe_account_id)
        is_submitted = account.details_submitted
        
        if is_submitted and not business.stripe_onboarding_complete:
            business.stripe_onboarding_complete = True
            business.save(update_fields=['stripe_onboarding_complete'])
            
        return {
            'isConnected': business.stripe_onboarding_complete,
            'detailsSubmitted': is_submitted,
            'accountId': business.stripe_account_id
        }

class ReviewService:
    @staticmethod
    def create_review(user, appointment_id, rating, comment):
        appointment = Appointment.objects.select_related('customer').get(id=appointment_id)
        if appointment.customer != user:
            raise PermissionDenied("You can only review your own appointments.")
            
        if appointment.status != 'COMPLETED':
            raise ValidationError("You can only review completed appointments.")
            
        if hasattr(appointment, 'review'):
            raise ValidationError("You have already reviewed this appointment.")
            
        review = Review.objects.create(
            appointment=appointment,
            rating=rating,
            comment=comment
        )
        return review

class AnalyticsService:
    @staticmethod
    def get_business_analytics(user, business_id):
        business = Business.objects.get(id=business_id)
        if business.owner != user:
            raise PermissionDenied("Only the owner can view analytics.")
            
        from django.db.models import Count, Sum
        from django.db.models.functions import TruncWeek
        
        appointments = Appointment.objects.filter(
            service__category__business=business,
            status__in=['COMPLETED', 'CONFIRMED']
        )
        
        # Revenue is sum of paid services (simplified: total price of COMPLETED/CONFIRMED that are PAID)
        total_revenue = appointments.filter(payment_status='PAID').aggregate(
            total=Sum('service__price')
        )['total'] or 0
        
        total_bookings = appointments.count()
        
        # Bookings per week
        weekly_bookings = appointments.annotate(
            week=TruncWeek('start_time')
        ).values('week').annotate(count=Count('id')).order_by('-week')[:4]
        
        return {
            'total_revenue': total_revenue,
            'total_bookings': total_bookings,
            'weekly_bookings': list(weekly_bookings)
        }
