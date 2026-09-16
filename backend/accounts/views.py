from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import status
from .models import CustomUser
from django.core.validators import validate_email

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "organization": user.organization.name if user.organization else None,
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        new_password_confirm = request.data.get("new_password_confirm")

        # Tarkistetaan, että kaikki kentät on annettu
        if not current_password or not new_password or not new_password_confirm:
            return Response(
                {"error": "Kaikki salasanakentät ovat pakollisia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tarkistetaan nykyinen salasana
        if not user.check_password(current_password):
            return Response(
                {"error": "Nykyinen salasana on virheellinen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tarkistetaan, että uudet salasanat täsmäävät
        if new_password != new_password_confirm:
            return Response(
                {"error": "Uudet salasanat eivät täsmää."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Käytetään Djangon salasanavalidointia
        try:
            validate_password(new_password, user=user)
        except ValidationError as error:
            return Response(
                {"error": error.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tallennetaan uusi salasana turvallisesti
        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Salasana vaihdettu onnistuneesti."},
            status=status.HTTP_200_OK,
        )

class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        new_email = request.data.get("email", "").strip()
        current_password = request.data.get("current_password", "")

        if not new_email or not current_password:
            return Response(
                {
                    "error": "Sähköpostiosoite ja nykyinen salasana ovat pakollisia."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vahvistetaan käyttäjän henkilöllisyys nykyisellä salasanalla
        if not user.check_password(current_password):
            return Response(
                {"error": "Nykyinen salasana on virheellinen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tarkistetaan sähköpostiosoitteen muoto
        try:
            validate_email(new_email)
        except ValidationError:
            return Response(
                {"error": "Anna kelvollinen sähköpostiosoite."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tarkistetaan, ettei sähköpostiosoite ole toisella käyttäjällä
        if CustomUser.objects.exclude(pk=user.pk).filter(
            email__iexact=new_email
        ).exists():
            return Response(
                {"error": "Sähköpostiosoite on jo käytössä."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.email = new_email
        user.save(update_fields=["email"])

        return Response(
            {
                "message": "Sähköpostiosoite vaihdettu onnistuneesti.",
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )