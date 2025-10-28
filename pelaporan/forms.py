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