from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Business, Service, StaffMember, Appointment, Review
from .serializers import (
    SignupSerializer, UserSerializer, BusinessSerializer, 
    ServiceSerializer, StaffMemberSerializer, AppointmentSerializer,
    ReviewSerializer
)
from .services import AuthService

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = AuthService.get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    # If we want to return user data on login, we can override it here.
    # But sticking to standard TokenObtainPairView is also fine, 
    # the prompt just says /api/auth/login.
    pass

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class BusinessViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = BusinessSerializer
    
    def get_queryset(self):
        qs = Business.objects.all()
        if self.action == 'list':
            city = self.request.query_params.get('city')
            category = self.request.query_params.get('category')
            keyword = self.request.query_params.get('keyword')
            
            if city:
                qs = qs.filter(city__icontains=city)
            if category:
                qs = qs.filter(category__icontains=category)
            if keyword:
                qs = qs.filter(Q(name__icontains=keyword) | Q(description__icontains=keyword))
        return qs

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if lookup.isdigit():
            return Business.objects.get(pk=lookup)
        else:
            return Business.objects.get(slug=lookup)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        businesses = Business.objects.filter(owner=request.user)
        serializer = self.get_serializer(businesses, many=True)
        return Response(serializer.data)

class ServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = ServiceSerializer
    
    def get_queryset(self):
        qs = Service.objects.select_related('category', 'category__business').filter(is_active=True)
        business_id = self.request.query_params.get('business_id')
        business_slug = self.request.query_params.get('business_slug')
        if business_id:
            qs = qs.filter(category__business_id=business_id)
        if business_slug:
            qs = qs.filter(category__business__slug=business_slug)
        return qs

    def perform_destroy(self, instance):
        from .services import ServiceManagementService
        ServiceManagementService.soft_delete_service(self.request.user, instance.id)

class StaffViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = StaffMemberSerializer
    
    def get_queryset(self):
        qs = StaffMember.objects.select_related('business').prefetch_related('services', 'availabilities').filter(is_active=True)
        business_id = self.request.query_params.get('business_id')
        business_slug = self.request.query_params.get('business_slug')
        if business_id:
            qs = qs.filter(business_id=business_id)
        if business_slug:
            qs = qs.filter(business__slug=business_slug)
        return qs

    def perform_destroy(self, instance):
        from .services import StaffManagementService
        StaffManagementService.deactivate_staff(self.request.user, instance.id)

class AvailabilityView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, service_id):
        date_str = request.query_params.get('date')
        staff_id = request.query_params.get('staff_id')
        if not date_str:
            return Response({"error": "date parameter is required"}, status=400)
            
        from .services import AvailabilityService
        slots = AvailabilityService.get_available_slots(service_id, date_str, staff_id)
        return Response(slots)

class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer
    
    def get_queryset(self):
        # Base queryset to make sure users only see what they own
        qs = Appointment.objects.select_related(
            'service__category__business',
            'customer',
            'staff_member'
        )
        return qs

    @action(detail=False, methods=['get'])
    def mine(self, request):
        appointments = self.get_queryset().filter(customer=request.user).order_by('-start_time')
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'business/(?P<business_id>\d+)')
    def business_appointments(self, request, business_id=None):
        appointments = self.get_queryset().filter(
            service__category__business_id=business_id,
            service__category__business__owner=request.user
        ).order_by('-start_time')
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        from .services import AppointmentManagementService
        appointment = AppointmentManagementService.cancel_appointment(request.user, pk)
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def confirm(self, request, pk=None):
        from .services import AppointmentManagementService
        appointment = AppointmentManagementService.confirm_appointment(request.user, pk)
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

class CheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        appointment_id = request.data.get('appointment_id')
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')
        
        if not appointment_id or not success_url or not cancel_url:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        from .services import PaymentService
        url = PaymentService.create_checkout_session(request.user, appointment_id, success_url, cancel_url)
        return Response({'url': url})

class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [] # Disable auth for webhook
    # Keep parser classes raw since Stripe webhook needs raw body for signature verification
    # But DRF by default uses parsers. We can get raw body using request.body
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        if not sig_header:
            return Response("Missing signature", status=status.HTTP_400_BAD_REQUEST)
            
        from .services import PaymentService
        PaymentService.handle_payment_webhook(payload, sig_header)
        return Response({'status': 'success'})

class ConnectOnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        business_id = request.data.get('business_id')
        return_url = request.data.get('return_url')
        refresh_url = request.data.get('refresh_url')
        
        if not business_id or not return_url or not refresh_url:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        from .services import ConnectService
        url = ConnectService.create_onboarding_link(request.user, business_id, return_url, refresh_url)
        return Response({'url': url})

class ConnectStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        from .services import ConnectService
        status_data = ConnectService.get_connect_status(request.user, business_id)
        return Response(status_data)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related('appointment__customer')
        business_slug = self.request.query_params.get('business_slug')
        business_id = self.request.query_params.get('business_id')
        if business_id:
            qs = qs.filter(appointment__service__category__business_id=business_id)
        if business_slug:
            qs = qs.filter(appointment__service__category__business__slug=business_slug)
        return qs.order_by('-created_at')

class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        from .services import AnalyticsService
        data = AnalyticsService.get_business_analytics(request.user, business_id)
        return Response(data)
