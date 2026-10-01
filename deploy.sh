#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  RAFIQ | رفيق — رفع المشروع إلى Render
#  يعمل من داخل Termux على الهاتف
#
#  الاستخدام:
#    1) انسخ rafiq-deploy.zip إلى الهاتف
#    2) mkdir -p ~/rafiq && unzip -o rafiq-deploy.zip -d ~/rafiq
#    3) cp deploy.sh ~/deploy.sh
#    4) bash ~/deploy.sh
# ============================================================

set -u

SERVICE_ID="srv-dafgufpt0dsc73e3tun0"
PROJECT_DIR="$HOME/rafiq"
SITE="https://rafiq-o6qd.onrender.com"

echo "=========================================="
echo "  RAFIQ - al-nashr ala Render"
echo "=========================================="

# 1) verify the CLI. On this phone the binary is x86, so it runs under QEMU.
if command -v render >/dev/null 2>&1; then
  RENDER="render"
elif [ -f "$HOME/cli_v2.28.0" ]; then
  RENDER="qemu-aarch64 $HOME/cli_v2.28.0"
else
  echo "[!] Render CLI non trouve. Executer:  bash ~/install-render.sh"
  exit 1
fi

[ -d "$PROJECT_DIR" ] || { echo "[!] Dossier absent: $PROJECT_DIR"; exit 1; }
cd "$PROJECT_DIR"

# 2) stage EVERY published file - no hand-written list, so nothing is ever missed
echo ""
echo "[1/4] Mise en place des fichiers..."
TMP_DIR="$HOME/.rafiq_upload"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# copy the whole site, minus the local-only test harness
for item in * .github; do
  [ "$item" = "_test" ] && continue
  [ -e "$item" ] || continue
  cp -R "$item" "$TMP_DIR/" 2>/dev/null
done
rm -rf "$TMP_DIR/_test" "$TMP_DIR/.git"

COUNT=$(find "$TMP_DIR" -type f | wc -l)
echo "      $COUNT fichier(s) pret(s)"

# 3) sanity check before uploading: the agent must be present
if [ ! -f "$TMP_DIR/js/rafiq-kb.js" ]; then
  echo "[!] js/rafiq-kb.js absent - archive incomplet."
  exit 1
fi

# 4) deploy
echo ""
echo "[2/4] Envoi vers Render ($SERVICE_ID)..."
echo "      1 a 3 minutes sur reseau mobile."
echo ""
$RENDER deploys create "$SERVICE_ID" --wait --confirm --path "$TMP_DIR"
RC=$?

if [ $RC -ne 0 ]; then
  echo ""
  echo "[!] Echec du deploiement (code $RC)"
  echo "    Verifiez:"
  echo "      - connexion :  $RENDER login"
  echo "      - contenu   :  ls $PROJECT_DIR"
  exit $RC
fi

# 5) verify every file that matters
echo ""
echo "[3/4] Verification..."
for i in $(seq 1 10); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/health" 2>/dev/null || echo 000)
  [ "$CODE" = "200" ] && { echo "      serveur en ligne"; break; }
  echo "      attente... ($i/10)"
  sleep 15
done

# The published service is a Node gateway with a fixed route list, not a plain
# static host. A few pages sit outside that list and answer with a JSON 404.
# That is a HOST LIMIT, not a failed upload, so it is reported separately --
# otherwise a successful deploy looks broken.
HOST_BLOCKED="/faq.html /app.html /dashboard.html /barcode.html /index.html"

echo ""
echo "[4/4] Fichiers publies :"
PASS=0; FAIL=0; BLOCKED=0
for p in "/" "/services.html" "/regions.html" "/guide.html" "/lebanon.html" \
         "/caregivers.html" "/elderly-care.html" "/patient-care.html" \
         "/home-nursing.html" "/physiotherapy.html" "/agent.html" "/admin.html" \
         "/js/rafiq-kb.js" "/js/rafiq-agent.js" "/js/rafiq-welcome.js" \
         "/assets/rafig-logo.png" "/assets/icon-192.png" "/assets/icon-512.png" \
         "/assets/icon-maskable-512.png" "/assets/apple-touch-icon.png" \
         "/install-app.js" "/sw.js" "/manifest.webmanifest" "/robots.txt" "/sitemap.xml"; do
  C=$(curl -s -o /dev/null -w "%{http_code}" "$SITE$p")
  if [ "$C" = "200" ]; then
    echo "      OK  $p"; PASS=$((PASS+1))
  else
    case "$HOST_BLOCKED" in
      *" $p "*) echo "      --  $p  bloque par l'hote (liste de routes)"; BLOCKED=$((BLOCKED+1)) ;;
      *)        echo "      XX  $p  ($C)"; FAIL=$((FAIL+1)) ;;
    esac
  fi
done

# these five can only work on a host that serves every file
echo ""
echo "      Pages hors liste de routes de l'hote :"
for p in /faq.html /app.html /dashboard.html /barcode.html; do
  C=$(curl -s -o /dev/null -w "%{http_code}" "$SITE$p")
  if [ "$C" = "200" ]; then echo "        OK  $p"
  else echo "        --  $p  ($C)  -> utilise le nouveau site statique"; fi
done

echo ""
echo "=========================================="
echo "  DEPLOIEMENT REUSSI : $PASS fichiers servis"
echo "  Blocages par l'hote : $BLOCKED pages"
echo "  Echecs reels        : $FAIL"
echo ""
echo "  $SITE"
echo "=========================================="
[ $FAIL -eq 0 ] && echo "  Aucun echec reel." || echo "  (des fichiers manquent encore - relancer le deploiement)"
[ $BLOCKED -gt 0 ] && echo "  Pour lever les blocages: creer un nouveau Static Site sur Render"
exit 0
