# pelaporan/context_processors.py
"""
Global context processors for LaporJalan Batam WebGIS.
Provides platform metadata and configurable official disclaimer.
"""

def platform_info(request):
    return {
        'PLATFORM_DISCLAIMER': (
            "Platform LaporJalan Batam adalah inisiatif teknologi geospasial partisipatif independen "
            "yang dikembangkan oleh komunitas dan pemerhati kota Batam. "
            "Platform ini BUKAN merupakan portal resmi pemerintah dan TIDAK terasosiasi, TIDAK dinaungi, "
            "serta TIDAK berafiliasi secara resmi dengan instansi pemerintah, dinas, atau badan publik manapun. "
            "Seluruh data titik kerusakan jalan dikumpulkan secara urun daya (crowdsourced) dari masyarakat "
            "untuk meningkatkan transparansi informasi dan kesadaran keselamatan jalan bersama."
        ),
        'PLATFORM_SHORT_DISCLAIMER': "Inisiatif Partisipatif Independen Komunitas Batam",
    }
