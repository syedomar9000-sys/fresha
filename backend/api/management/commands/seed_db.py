from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from api.models import Business, ServiceCategory, Service, StaffMember, StaffAvailability, Appointment, Review
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with high-quality dummy data to simulate a live Fresha environment'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing dummy data...')
        # We will not delete users here to avoid deleting the dev's admin account, 
        # but we'll fetch or create dummy users.

        owner1, _ = User.objects.get_or_create(username='salon_owner', defaults={'email': 'owner1@test.com', 'role': 'BUSINESS', 'first_name': 'Sarah', 'last_name': 'Styles'})
        if _: owner1.set_password('password123'); owner1.save()

        owner2, _ = User.objects.get_or_create(username='barber_owner', defaults={'email': 'owner2@test.com', 'role': 'BUSINESS', 'first_name': 'Mike', 'last_name': 'Cuts'})
        if _: owner2.set_password('password123'); owner2.save()

        customer1, _ = User.objects.get_or_create(username='customer1', defaults={'email': 'cust1@test.com', 'role': 'CUSTOMER', 'first_name': 'Emma', 'last_name': 'Watson'})
        if _: customer1.set_password('password123'); customer1.save()

        customer2, _ = User.objects.get_or_create(username='customer2', defaults={'email': 'cust2@test.com', 'role': 'CUSTOMER', 'first_name': 'John', 'last_name': 'Doe'})
        if _: customer2.set_password('password123'); customer2.save()

        self.stdout.write('Creating Businesses...')
        # 1. Glow Beauty Salon
        b1, _ = Business.objects.get_or_create(
            owner=owner1,
            name="Glow Beauty Salon",
            defaults={
                'slug': slugify("Glow Beauty Salon"),
                'description': 'Experience luxury and relaxation. We specialize in haircuts, coloring, and premium spa treatments. Award winning salon in the heart of downtown.',
                'category': 'Hair Salon',
                'city': 'New York',
                'address': '123 5th Ave',
                'phone_number': '+1234567890',
                'contact_email': 'hello@glowbeauty.com'
            }
        )

        # 2. Fade Factory Barbershop
        b2, _ = Business.objects.get_or_create(
            owner=owner2,
            name="Fade Factory Barbershop",
            defaults={
                'slug': slugify("Fade Factory Barbershop"),
                'description': 'Classic cuts, modern fades, and straight razor shaves. Grab a complimentary drink while you wait.',
                'category': 'Barbershop',
                'city': 'Chicago',
                'address': '456 Rush St',
                'phone_number': '+1987654321',
                'contact_email': 'cuts@fadefactory.com'
            }
        )

        self.stdout.write('Creating Categories & Services...')
        # Glow Services
        cat_hair, _ = ServiceCategory.objects.get_or_create(business=b1, name="Hair Styling")
        cat_spa, _ = ServiceCategory.objects.get_or_create(business=b1, name="Spa & Massage")

        s1, _ = Service.objects.get_or_create(category=cat_hair, name="Women's Haircut & Blowdry", defaults={'description': 'Premium wash, cut, and blowdry styling.', 'price': 80.00, 'duration_minutes': 60})
        s2, _ = Service.objects.get_or_create(category=cat_hair, name="Balayage / Highlights", defaults={'description': 'Full balayage treatment with toner.', 'price': 150.00, 'deposit': 50.00, 'duration_minutes': 120})
        s3, _ = Service.objects.get_or_create(category=cat_spa, name="Deep Tissue Massage", defaults={'description': '60-minute full body deep tissue massage.', 'price': 90.00, 'duration_minutes': 60})

        # Fade Factory Services
        cat_barber, _ = ServiceCategory.objects.get_or_create(business=b2, name="Barbering")
        
        s4, _ = Service.objects.get_or_create(category=cat_barber, name="Skin Fade", defaults={'description': 'Precision skin fade with lineup.', 'price': 35.00, 'duration_minutes': 30})
        s5, _ = Service.objects.get_or_create(category=cat_barber, name="Haircut + Beard Trim", defaults={'description': 'Full haircut and beard sculpting with hot towel.', 'price': 50.00, 'duration_minutes': 45})

        self.stdout.write('Creating Staff & Availability...')
        # Glow Staff
        staff1, _ = StaffMember.objects.get_or_create(business=b1, first_name="Jessica", last_name="Taylor", defaults={'bio': 'Senior Stylist with 10 years of experience.'})
        staff1.services.set([s1, s2])
        staff2, _ = StaffMember.objects.get_or_create(business=b1, first_name="Anna", last_name="Smith", defaults={'bio': 'Certified Massage Therapist.'})
        staff2.services.set([s3])

        # Fade Factory Staff
        staff3, _ = StaffMember.objects.get_or_create(business=b2, first_name="Marcus", last_name="Johnson", defaults={'bio': 'Master Barber.'})
        staff3.services.set([s4, s5])

        # Add availability (Monday to Friday, 9 to 5)
        for staff in [staff1, staff2, staff3]:
            if not StaffAvailability.objects.filter(staff_member=staff).exists():
                for day in range(5): # 0=Mon, 4=Fri
                    StaffAvailability.objects.create(staff_member=staff, day_of_week=day, start_time="09:00:00", end_time="17:00:00")

        self.stdout.write('Creating Appointments & Reviews...')
        now = timezone.now()
        
        # Glow Appointment (Past, Completed, Reviewed)
        if not Appointment.objects.filter(customer=customer1, service=s1).exists():
            app1 = Appointment.objects.create(
                customer=customer1, service=s1, staff_member=staff1,
                start_time=now - timedelta(days=2, hours=3),
                end_time=now - timedelta(days=2, hours=2),
                status='COMPLETED', payment_status='PAID'
            )
            Review.objects.create(appointment=app1, rating=5, comment="Jessica was amazing! My hair looks flawless.")

        # Fade Factory Appointment (Past, Completed, Reviewed)
        if not Appointment.objects.filter(customer=customer2, service=s4).exists():
            app2 = Appointment.objects.create(
                customer=customer2, service=s4, staff_member=staff3,
                start_time=now - timedelta(days=1, hours=2),
                end_time=now - timedelta(days=1, hours=1, minutes=30),
                status='COMPLETED', payment_status='PAID'
            )
            Review.objects.create(appointment=app2, rating=4, comment="Great fade, but had to wait a bit past my appointment time.")

        # Future appointments
        if not Appointment.objects.filter(status='CONFIRMED').exists():
            Appointment.objects.create(
                customer=customer1, service=s3, staff_member=staff2,
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=3),
                status='CONFIRMED', payment_status='DEPOSIT_PAID'
            )
            Appointment.objects.create(
                customer=customer2, service=s5, staff_member=staff3,
                start_time=now + timedelta(days=2, hours=5),
                end_time=now + timedelta(days=2, hours=5, minutes=45),
                status='CONFIRMED', payment_status='UNPAID'
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded dummy data! You can log in with: salon_owner / password123, barber_owner / password123, or customer1 / password123'))
