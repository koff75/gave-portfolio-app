# Configuration Vercel pour l'Application Portfolio Charles Gave

## 🔧 Configuration des Variables d'Environnement

### 1. Obtenir une clé API Finnhub (GRATUITE)

1. Aller sur https://finnhub.io/register
2. Créer un compte gratuit
3. Copier votre clé API de la forme `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configuration dans Vercel Dashboard

1. Aller dans votre projet Vercel
2. `Settings` > `Environment Variables`
3. Ajouter une nouvelle variable :
   - **Name**: `FINNHUB_API_KEY`
   - **Value**: Votre clé API Finnhub
   - **Environments**: Production, Preview, Development

### 3. Configuration via Vercel CLI (Alternative)

```bash
# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Se connecter
vercel login

# Ajouter la variable d'environnement
vercel env add FINNHUB_API_KEY
# Coller votre clé API quand demandé
# Sélectionner Production, Preview, Development

# Redéployer
vercel --prod
```

## 🚀 Déploiement

### Déploiement Initial
```bash
# Cloner le projet
git clone <votre-repo>
cd gave-portfolio-app

# Déployer
vercel

# Configurer les variables d'environnement (voir ci-dessus)

# Redéployer avec les variables
vercel --prod
```

### Redéploiement après modification
```bash
# Committer vos changements
git add .
git commit -m "Update: sécurisation API"
git push

# Vercel redéploiera automatiquement si connecté à Git
# Ou manuellement :
vercel --prod
```

## 🔒 Sécurité

### ✅ Ce qui est sécurisé maintenant :
- Clé API stockée côté serveur (variables d'environnement Vercel)
- Proxy serverless pour les appels API
- Validation des endpoints autorisés
- Pas d'exposition de la clé côté client

### ⚠️ Points d'attention :
- Ne jamais committer de vraies clés API dans le code
- Utiliser `.env.local` en développement local
- Vérifier que les variables sont bien configurées dans Vercel

## 📊 Fonctionnement avec API Finnhub

### Données récupérées :
1. **Cours en temps réel** : Or (GLD), Obligations (TLT), Actions (CW8.PA)
2. **Données historiques** : 7 ans de données hebdomadaires pour moyennes mobiles
3. **Actions françaises IDL** : 10 titres du portefeuille Gave
4. **Benchmarks** : CAC 40, S&P 500, DAX, Bitcoin

### Fallback sans API :
- Valeurs fixes basées sur les principes du livre Charles Gave
- Prix de référence 2024-2025
- Ratios historiques moyens
- Calculs continuent de fonctionner

## 🧪 Test de l'API

```javascript
// Test dans la console du navigateur après déploiement
fetch('/api/finnhub-proxy?endpoint=quote&symbol=GLD')
  .then(r => r.json())
  .then(console.log)
```

## 📝 Logs et Monitoring

- Logs visibles dans Vercel Dashboard > Functions
- Validation automatique des données selon le livre Gave
- Alertes en cas de valeurs anormales
- Cache de 5 minutes pour optimiser les appels

## 🆘 Dépannage

### Erreur "API configuration error"
- Vérifier que `FINNHUB_API_KEY` est bien configurée dans Vercel
- Redéployer après avoir ajouté la variable

### Erreur "Method not allowed"
- L'API proxy n'accepte que les requêtes GET

### Données manquantes
- L'app utilise automatiquement les valeurs de fallback
- Vérifier les logs pour voir les erreurs d'API

### Quotas API dépassés
- Plan gratuit Finnhub : 60 appels/minute
- L'app limite automatiquement avec des délais
- Considérer un upgrade si nécessaire
