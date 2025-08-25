# 🚀 Portfolio Gave App - Outil d'analyse de portefeuille

> **⚠️ Disclaimer :** Cet outil est **indépendant et non-officiel**. Il s'inspire des principes publics mais n'est affilié à personnes.

## 📋 Description

Application web d'analyse de portefeuille inspirée d'une méthode, permettant d'optimiser l'allocation d'actifs selon les principes du portefeuille permanent amélioré.

## ✨ Fonctionnalités

- 📊 **Analyse de portefeuille** en 4 étapes
- 🎯 **Signaux de marché** en temps réel
- 🐻 **Protection Grizzly** contre les krachs
- 📈 **Recommandations personnalisées** d'allocation
- 💰 **Suivi de performance** avec benchmarks
- 🎓 **Quiz éducatif** sur les quadrants économiques

## 🏗️ Architecture

- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Backend** : API serverless Vercel
- **Charts** : Chart.js pour les visualisations
- **Déploiement** : Vercel avec CDN global

## 🚀 Déploiement

### Prérequis
- Node.js 22.x
- Compte Vercel
- Clé API Finnhub (optionnelle)

### Installation
```bash
# Cloner le repository
git clone https://github.com/koff75/gave-portfolio-app.git
cd gave-portfolio-app

# Installer les dépendances
npm install

# Déployer sur Vercel
vercel --prod
```

### Variables d'environnement
Créez un fichier `.env.local` (non commité) :
```env
FINNHUB_API_KEY=votre_clé_api_finnhub
```

## 📁 Structure du projet

```
gave-portfolio-app/
├── public/                 # Fichiers statiques
│   ├── index.html         # Page principale
│   ├── style.css          # Styles CSS
│   ├── app.js             # Logique JavaScript
│   └── *.txt              # Documentation
├── api/                   # API serverless
│   └── finnhub-proxy.js   # Proxy API Finnhub
├── vercel.json            # Configuration Vercel
├── package.json           # Dépendances Node.js
└── .gitignore            # Fichiers exclus de Git
```

## 🔒 Sécurité

- ✅ **Clés API protégées** par `.gitignore`
- ✅ **CORS configuré** pour l'API
- ✅ **Validation des endpoints** autorisés
- ✅ **Gestion d'erreurs** sécurisée

## 📚 Méthode

Cet outil implémente les concepts de :
- **Portefeuille permanent amélioré**
- **Allocation dynamique** selon les signaux de marché
- **Protection anti-krach** via les ratios d'actifs
- **Quadrants économiques** (croissance/déflation/inflation/récession)

## 🌐 Démo en ligne

- **URL de production** : [https://gave-portfolio-app.vercel.app](https://gave-portfolio-app.vercel.app)
- **Dashboard Vercel** : [https://vercel.com/dashboard](https://vercel.com/dashboard)

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

**Développé avec ❤️**
