from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    SignupView, CustomTokenObtainPairView, MeView, BusinessViewSet, 
    ServiceViewSet, StaffViewSet, AvailabilityView, AppointmentViewSet,
    CheckoutSessionView, StripeWebhookView, ConnectOnboardingView, ConnectStatusView,
    ReviewViewSet, AnalyticsView
)

router = DefaultRouter()
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('auth/signup', SignupView.as_view(), name='signup'),
    path('auth/login', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me', MeView.as_view(), name='me'),
    
    path('appointments/availability/<int:service_id>', AvailabilityView.as_view(), name='availability'),
    
    path('payments/checkout-session', CheckoutSessionView.as_view(), name='checkout_session'),
    path('payments/webhook', StripeWebhookView.as_view(), name='stripe_webhook'),
    path('connect/onboarding-link', ConnectOnboardingView.as_view(), name='connect_onboarding'),
    path('connect/status/<int:business_id>', ConnectStatusView.as_view(), name='connect_status'),
    path('analytics/<int:business_id>', AnalyticsView.as_view(), name='analytics'),
    
    path('', include(router.urls)),
]
