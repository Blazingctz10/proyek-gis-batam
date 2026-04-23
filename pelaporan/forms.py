# pelaporan/forms.py
from django import forms
from .models import LaporanJalan
from django_recaptcha.fields import ReCaptchaField
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User

class LaporanForm(forms.ModelForm):
    latitude = forms.FloatField(widget=forms.HiddenInput())
    longitude = forms.FloatField(widget=forms.HiddenInput())
    
    captcha = ReCaptchaField()

    class Meta:
        model = LaporanJalan
        fields = ['jenis_kerusakan', 'tingkat_kerusakan', 'deskripsi', 'email_pelapor']  # ✅ TAMBAH FIELD BARU
        widgets = {
            'jenis_kerusakan': forms.Select(attrs={
                'class': 'form-select',
            }),
            'tingkat_kerusakan': forms.Select(attrs={
                'class': 'form-select',
            }),
            'deskripsi': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Jelaskan kondisi kerusakan yang Anda temukan...'
            }),
            'email_pelapor': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'nama@email.com'
            }),
        }
        labels = {
            'jenis_kerusakan': 'Jenis Kerusakan',
            'tingkat_kerusakan': 'Tingkat Kerusakan',
            'deskripsi': 'Deskripsi Kerusakan',
            'email_pelapor': 'Email Anda (Opsional)',
        }


class FeedbackForm(forms.Form):
    nama = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nama Anda (Opsional)'
        })
    )
    email = forms.EmailField(
        required=False,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Anda (Opsional)'
        })
    )
    subjek = forms.CharField(
        max_length=150,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Subjek Pesan'
        })
    )
    pesan = forms.CharField(
        required=True,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 5,
            'placeholder': 'Tuliskan umpan balik Anda di sini...'
        })
    )
    
    # ✅ TAMBAH RECAPTCHA DI FEEDBACK JUGA!
    captcha = ReCaptchaField()


# ✅ FORM REGISTRASI USER BARU
class RegisterForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'nama@email.com'
        })
    )
    first_name = forms.CharField(
        max_length=100,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nama Depan'
        })
    )
    last_name = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nama Belakang (Opsional)'
        })
    )
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password1', 'password2']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Username'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Password'})
        self.fields['password2'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Konfirmasi Password'})
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Email sudah terdaftar!')
        return email


# ✅ FORM LOGIN (CUSTOM STYLING)
class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Username'
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Password'
        })
    )