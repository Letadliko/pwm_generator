# Vytvoří dokumentace.pdf ze souboru dokumentace.html (python3 build.py).
# Doplní výsledky měření z emulace a za stranu 1 vloží schéma z ../schema/pwm_generator.pdf.
#
# Potřebuje Chrome, Chromium nebo Edge (cestu jde zadat proměnnou CHROME) a pypdf.
import glob
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SIM = os.path.join(HERE, '..', 'sim', 'vystup')


def cz(x, des):
    s = '{:,.{d}f}'.format(x, d=des)
    return s.replace(',', ' ').replace('.', ',')


def mereni():
    m = json.load(open(os.path.join(SIM, 'mereni.json'), encoding='utf-8'))
    radky = []
    for r in m['freqSweep']:
        if r['set'] in (50, 1000, 10000, 100000, 1000000, 2000000, 4000000):
            radky.append((r['set'], 50, r['freq'], r['duty']))
    f_1k = next(r['freq'] for r in m['freqSweep'] if r['set'] == 1000)
    for r in m['dutySweep']:
        if r['f'] == 1000 and r['set'] in (10, 25, 90):
            radky.append((1000, r['set'], f_1k, r['duty']))
    html = '<table><tr><th>Nastaveno</th><th>Naměřený kmitočet</th><th>Naměřená střída</th></tr>'
    for f, d, fm, dm in radky:
        html += '<tr><td>%s Hz, %d %%</td><td class="cislo">%s Hz</td><td class="cislo">%s %%</td></tr>' % (
            cz(f, 0), d, cz(fm, 3), cz(dm, 1))
    return html + '</table>'


def testy():
    md = open(os.path.join(SIM, 'vysledek.md'), encoding='utf-8').read()
    vysledky = re.findall(r'^\| \d+ \| .+? \| (OK|CHYBA) \|', md, flags=re.M)
    return 'prošlo %d z %d testů' % (vysledky.count('OK'), len(vysledky))


def najdi_chrome():
    if os.environ.get('CHROME'):
        return os.environ['CHROME']
    for jmeno in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome', 'msedge'):
        if shutil.which(jmeno):
            return shutil.which(jmeno)
    for cesta in glob.glob('/opt/pw-browsers/chromium-*/chrome-linux/chrome') + [
            r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']:
        if os.path.exists(cesta):
            return cesta
    sys.exit('nenašel jsem Chrome ani Chromium, nastav proměnnou CHROME')


if not os.path.exists(os.path.join(HERE, 'obrazky', 'prubehy_pwm.png')):
    subprocess.run([sys.executable, os.path.join(HERE, 'figures.py')], check=True)

text = open(os.path.join(HERE, 'dokumentace.html'), encoding='utf-8').read()
text = text.replace('{{MERENI}}', mereni()).replace('{{TESTY}}', testy())

docasny = os.path.join(HERE, '_tisk.html')
open(docasny, 'w', encoding='utf-8').write(text)
pdf = os.path.join(HERE, 'dokumentace.pdf')
prikaz = [najdi_chrome(), '--headless', '--disable-gpu', '--no-pdf-header-footer',
          '--allow-file-access-from-files', '--print-to-pdf=' + pdf, pathlib.Path(docasny).as_uri()]
if hasattr(os, 'geteuid') and os.geteuid() == 0:
    prikaz.insert(1, '--no-sandbox')
subprocess.run(prikaz, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
os.remove(docasny)

# schéma z KiCadu (A4 na šířku) se vloží před kapitolu 3
from pypdf import PdfReader, PdfWriter
text_pdf = PdfReader(pdf)
schema = PdfReader(os.path.join(HERE, '..', 'schema', 'pwm_generator.pdf'))
kam = next(i for i, s in enumerate(text_pdf.pages) if '3. Ovládání' in (s.extract_text() or ''))
vystup = PdfWriter()
for i, strana in enumerate(text_pdf.pages):
    if i == kam:
        vystup.add_page(schema.pages[0])
    vystup.add_page(strana)
vystup.add_metadata({'/Title': 'Generátor PWM s Raspberry Pi Pico'})
with open(pdf, 'wb') as f:
    vystup.write(f)
print('hotovo:', pdf, '(%d stran)' % len(vystup.pages))
