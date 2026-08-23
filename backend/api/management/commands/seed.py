from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Business, StaffMember, ServiceCategory, Service, Appointment

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with a demo customer and business owner'

    def handle(self, *args, **kwargs):
        # Create business owner
        owner, created = User.objects.get_or_create(
            username='owner',
            defaults={
                'email': 'owner@bookit.com',
                'first_name': 'Alice',
                'last_name': 'Owner',
                'role': 'BUSINESS_OWNER'
            }
        )
        if created:
            owner.set_password('password123')
            owner.save()
            self.stdout.write(self.style.SUCCESS(f'Created business owner: {owner.username}'))

        # Create business
        business, created = Business.objects.get_or_create(
            owner=owner,
            defaults={
                'name': "Alice's Salon",
                'description': 'A beautiful salon.',
                'address': '123 Main St',
                'phone_number': '555-1234'
            }
        )
        
        # Create staff member
        staff, created = StaffMember.objects.get_or_create(
            business=business,
            first_name='Bob',
            last_name='Staff'
        )

        # Create category & service
        category, created = ServiceCategory.objects.get_or_create(
            business=business,
            name='Haircut'
        )
        service, created = Service.objects.get_or_create(
            category=category,
            name="Men's Haircut",
            defaults={'price': 30.00, 'duration_minutes': 30}
        )

        # Create customer
        customer, created = User.objects.get_or_create(
            username='customer',
            defaults={
                'email': 'customer@bookit.com',
                'first_name': 'Charlie',
                'last_name': 'Customer',
                'role': 'CUSTOMER'
            }
        )
        if created:
            customer.set_password('password123')
            customer.save()
            self.stdout.write(self.style.SUCCESS(f'Created customer: {customer.username}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded the database.'))
