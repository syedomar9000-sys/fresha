from rest_framework import serializers
from .models import User, Business, Service, StaffMember, StaffAvailability, ServiceCategory, Appointment, Review

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')
        read_only_fields = ('id', 'role')

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default='CUSTOMER')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'role')

    def create(self, validated_data):
        from .services import AuthService
        return AuthService.signup(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'CUSTOMER')
        )

class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ('id', 'name', 'slug', 'description', 'category', 'city', 'address', 'phone_number', 'contact_email', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def create(self, validated_data):
        from .services import BusinessManagementService
        return BusinessManagementService.create_business(
            user=self.context['request'].user,
            **validated_data
        )

    def update(self, instance, validated_data):
        from .services import BusinessManagementService
        return BusinessManagementService.update_business(
            user=self.context['request'].user,
            business_id=instance.id,
            **validated_data
        )

class ServiceSerializer(serializers.ModelSerializer):
    categoryName = serializers.CharField(source='category.name', read_only=True)
    category = serializers.CharField(write_only=True, required=False)
    business_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Service
        fields = ('id', 'name', 'description', 'price', 'deposit', 'duration_minutes', 'category', 'categoryName', 'is_active', 'business_id')
        read_only_fields = ('id', 'is_active', 'categoryName')
        
    def create(self, validated_data):
        from .services import ServiceManagementService
        business_id = validated_data.pop('business_id')
        return ServiceManagementService.create_service(
            user=self.context['request'].user,
            business_id=business_id,
            **validated_data
        )

    def update(self, instance, validated_data):
        from .services import ServiceManagementService
        validated_data.pop('business_id', None)
        return ServiceManagementService.update_service(
            user=self.context['request'].user,
            service_id=instance.id,
            **validated_data
        )

class StaffAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffAvailability
        fields = ('day_of_week', 'start_time', 'end_time')

class StaffMemberSerializer(serializers.ModelSerializer):
    availabilities = StaffAvailabilitySerializer(many=True, required=False)
    services = serializers.PrimaryKeyRelatedField(many=True, queryset=Service.objects.all(), required=False)
    business_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = StaffMember
        fields = ('id', 'first_name', 'last_name', 'bio', 'services', 'availabilities', 'is_active', 'business_id')
        read_only_fields = ('id', 'is_active')

    def create(self, validated_data):
        from .services import StaffManagementService
        business_id = validated_data.pop('business_id')
        availabilities = validated_data.pop('availabilities', None)
        services = validated_data.pop('services', None)
        return StaffManagementService.create_staff(
            user=self.context['request'].user,
            business_id=business_id,
            availabilities=availabilities,
            services=services,
            **validated_data
        )

    def update(self, instance, validated_data):
        from .services import StaffManagementService
        validated_data.pop('business_id', None)
        availabilities = validated_data.pop('availabilities', None)
        services = validated_data.pop('services', None)
        return StaffManagementService.update_staff(
            user=self.context['request'].user,
            staff_id=instance.id,
            availabilities=availabilities,
            services=services,
            **validated_data
        )

class AppointmentSerializer(serializers.ModelSerializer):
    service_id = serializers.IntegerField(write_only=True)
    staff_id = serializers.IntegerField(write_only=True)
    date = serializers.CharField(write_only=True)
    start_time_str = serializers.CharField(write_only=True)
    
    service = ServiceSerializer(read_only=True)
    staff_member = StaffMemberSerializer(read_only=True)
    customer = UserSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = ('id', 'service_id', 'staff_id', 'date', 'start_time_str', 'customer', 'service', 'staff_member', 'start_time', 'end_time', 'status', 'payment_status', 'notes', 'created_at')
        read_only_fields = ('id', 'start_time', 'end_time', 'status', 'payment_status', 'customer', 'service', 'staff_member', 'created_at')

    def create(self, validated_data):
        from .services import AppointmentManagementService
        return AppointmentManagementService.create_appointment(
            user=self.context['request'].user,
            service_id=validated_data.pop('service_id'),
            staff_id=validated_data.pop('staff_id'),
            date_str=validated_data.pop('date'),
            start_time_str=validated_data.pop('start_time_str'),
            notes=validated_data.pop('notes', '')
        )

class ReviewSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(write_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ('id', 'appointment_id', 'rating', 'comment', 'created_at', 'customer_name')
        read_only_fields = ('id', 'created_at', 'customer_name')

    def get_customer_name(self, obj):
        return f"{obj.appointment.customer.first_name} {obj.appointment.customer.last_name}".strip() or obj.appointment.customer.username

    def create(self, validated_data):
        from .services import ReviewService
        return ReviewService.create_review(
            user=self.context['request'].user,
            appointment_id=validated_data.pop('appointment_id'),
            rating=validated_data.pop('rating'),
            comment=validated_data.pop('comment', '')
        )
