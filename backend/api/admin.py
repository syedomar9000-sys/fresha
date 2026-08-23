from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Business, StaffMember, StaffAvailability, ServiceCategory, Service, Appointment, Review

admin.site.register(User, UserAdmin)
admin.site.register(Business)
admin.site.register(StaffMember)
admin.site.register(StaffAvailability)
admin.site.register(ServiceCategory)
admin.site.register(Service)
admin.site.register(Appointment)
admin.site.register(Review)
