import time
from importlib import import_module
from django.conf import settings
from django.contrib.sessions.backends.base import UpdateError
from django.contrib.sessions.exceptions import SessionInterrupted
from django.contrib.sessions.middleware import SessionMiddleware
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date


class SeparateAdminSessionMiddleware(SessionMiddleware):
    """
    Middleware untuk memisahkan sesi login antara Django Admin dan Web Utama (Portal Warga).
    - Request ke /admin/... atau /admin-* menggunakan cookie: 'admin_sessionid'
    - Request ke web publik (/, /peta/, /dashboard/, /login/, dll) menggunakan cookie: 'sessionid'
    
    Dengan pemisahan ini, login admin di Django Admin tidak akan 'tersangkut' atau
    mengubah status login pengguna di halaman utama, dan keduanya dapat berjalan
    secara independen di browser yang sama.
    """

    def _get_cookie_name(self, request):
        if request.path.startswith('/admin'):
            return getattr(settings, 'ADMIN_SESSION_COOKIE_NAME', 'admin_sessionid')
        return settings.SESSION_COOKIE_NAME

    def process_request(self, request):
        cookie_name = self._get_cookie_name(request)
        session_key = request.COOKIES.get(cookie_name)
        request.session = self.SessionStore(session_key)

    def process_response(self, request, response):
        try:
            accessed = request.session.accessed
            modified = request.session.modified
            empty = request.session.is_empty()
        except AttributeError:
            return response

        cookie_name = self._get_cookie_name(request)

        # Hapus cookie jika sesi kosong
        if cookie_name in request.COOKIES and empty:
            response.delete_cookie(
                cookie_name,
                path=settings.SESSION_COOKIE_PATH,
                domain=settings.SESSION_COOKIE_DOMAIN,
                samesite=settings.SESSION_COOKIE_SAMESITE,
            )
            patch_vary_headers(response, ("Cookie",))
        else:
            if accessed:
                patch_vary_headers(response, ("Cookie",))
            if (modified or settings.SESSION_SAVE_EVERY_REQUEST) and not empty:
                if request.session.get_expire_at_browser_close():
                    max_age = None
                    expires = None
                else:
                    max_age = request.session.get_expiry_age()
                    expires_time = time.time() + max_age
                    expires = http_date(expires_time)

                if response.status_code < 500:
                    try:
                        request.session.save()
                    except UpdateError:
                        raise SessionInterrupted(
                            "Sesi telah dihapus sebelum request selesai."
                        )
                    response.set_cookie(
                        cookie_name,
                        request.session.session_key,
                        max_age=max_age,
                        expires=expires,
                        domain=settings.SESSION_COOKIE_DOMAIN,
                        path=settings.SESSION_COOKIE_PATH,
                        secure=settings.SESSION_COOKIE_SECURE or None,
                        httponly=settings.SESSION_COOKIE_HTTPONLY or None,
                        samesite=settings.SESSION_COOKIE_SAMESITE,
                    )
        return response
