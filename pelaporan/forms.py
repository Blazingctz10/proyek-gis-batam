# pelaporan/forms.py
from django import forms
from .models import LaporanJalan
from django_recaptcha.fields import ReCaptchaField 

class LaporanForm(forms.ModelForm):
    latitude = forms.FloatField(widget=forms.HiddenInput())
    longitude = forms.FloatField(widget=forms.HiddenInput())
    
    # Kita pakai v2 (ReCaptchaField)
    captcha = ReCaptchaField() 

    class Meta:
        model = LaporanJalan
        fields = ['deskripsi', 'email_pelapor']
        widgets = {
            'deskripsi': forms.Textarea(attrs={
                'class': 'form-control', 
                'rows': 4
            }),
            'email_pelapor': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'nama@email.com'
            }),
        }
class FeedbackForm(forms.Form):
    nama = forms.CharField(
        max_length=100,
        required=False, # Optional name
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nama Anda (Opsional)'})
    )
    email = forms.EmailField(
        required=False, # Optional email
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email Anda (Opsional)'})
    )
    subjek = forms.CharField(
        max_length=150,
        required=True, # Subject is required
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Subjek Pesan'})
    )
    pesan = forms.CharField(
        required=True, # Message is required
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 5, 'placeholder': 'Tuliskan umpan balik Anda di sini...'})
    )