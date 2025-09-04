# 🎨 Guida Favicon per LiberaSphere

## File Favicon Necessari

Sostituisci questi file placeholder nella cartella `public/` con i tuoi favicon:

### **File Richiesti:**
1. `favicon.ico` (16x16, 32x32, 48x48) - Multi-size ICO file
2. `favicon-16x16.png` (16x16 px @ 72 DPI)
3. `favicon-32x32.png` (32x32 px @ 72 DPI)
4. `apple-touch-icon.png` (180x180 px @ 144 DPI)
5. `icon-192.png` (192x192 px @ 72 DPI)
6. `icon-512.png` (512x512 px @ 72 DPI)

## 🛠️ Strumenti Consigliati

### **Generatori Online:**
- **favicon.io** → Genera da testo/immagine
- **realfavicongenerator.net** → Set completo ottimizzato
- **favicon-generator.org** → Semplice e veloce

### **Design Suggerimenti:**
- Usa il logo LiberaSphere
- Colori: Arancione (#ff6600) su sfondo bianco/trasparente
- Design semplice e riconoscibile anche a 16px

## 📱 Test Dispositivi

Dopo aver sostituito i file, testa su:
- ✅ Browser desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile iOS (Safari)
- ✅ Mobile Android (Chrome)
- ✅ Tab del browser
- ✅ Bookmarks
- ✅ Home screen (quando salvata come PWA)

## 🚀 Deploy

Dopo aver sostituito i file:
```bash
npm run build
firebase deploy --only hosting
```

## 🎯 Dimensioni Ottimali

| File | Dimensioni | Uso |
|------|------------|-----|
| favicon.ico | 16x16, 32x32, 48x48 | Browser classici |
| favicon-16x16.png | 16x16 px | Tab browser |
| favicon-32x32.png | 32x32 px | Desktop/bookmarks |
| apple-touch-icon.png | 180x180 px | iOS home screen |
| icon-192.png | 192x192 px | Android/PWA |
| icon-512.png | 512x512 px | PWA splash screen |
