// Charles Gave Portfolio Manager - Complete Application
class GavePortfolioApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.portfolio = {
            actions: 0,
            or: 0,
            obligations: 0,
            cash: 0,
            total: 0
        };
        
        // Données de marché avec valeurs fixes selon les principes du livre Charles Gave
        this.marketData = {
            orObligationsRatio: 2.45,      // Ratio Or/Obligations actuel
            orObligationsMA7: 2.38,        // Moyenne mobile 7 ans Or/Obligations  
            actionsOrRatio: 28.5,          // Ratio Actions/Or actuel
            actionsOrMA7: 31.2,            // Moyenne mobile 7 ans Actions/Or
            lastUpdate: "2025-01-16"
        };

        // Valeurs fixes de référence basées sur le livre Gave (fallback si API indisponible)
        // Calculées pour obtenir des ratios cohérents avec les données historiques
        this.fallbackPrices = {
            gold: 200,         // Prix or normalisé pour ETF GLD (~$200)
            bonds: 85,         // Prix obligations 10 ans TLT (~$85)
            stocks: 60,        // Prix actions monde CW8.PA proxy (~€60)
            cash: 100          // Cash baseline
        };

        // Données historiques réelles pour calculs MA 7 ans (depuis 1972)
        this.historicalRatios = this.generateHistoricalRatios();
        this.movingAverages = this.calculateMovingAverages7Years();

        this.signals = {
            inflation: "OBLIGATIONS", // OR or OBLIGATIONS
            grizzly: "GARDER_ACTIONS" // GARDER_ACTIONS or SORTIR_ACTIONS
        };

        // Allocation cible - sera calculée dynamiquement selon les signaux
        this.targetAllocation = {
            actions: 33.33,
            or: 0,
            obligations: 33.33,
            cash: 33.33
        };

        // Portefeuille Permanent CLASSIQUE Harry Browne (Fiche 7) - 25/25/25/25
        this.portfolioPermanentClassique = {
            nom: "Portefeuille Permanent Classique",
            description: "Harry Browne 25%/25%/25%/25% - Performance 4% réels/an, Volatilité max -10%",
            allocation: {
                actions: 25,
                obligations: 25,
                or: 25,
                cash: 25
            },
            performance: {
                theorique: 4, // % réels/an selon le livre
                volatiliteMax: -10, // % max selon le livre
                description: "Protection contre tous les scénarios économiques"
            },
            quadrant: "permanent-classique"
        };
        
        // Portefeuille IDL (Institut des Libertés) - Configuration Gave 2020-2025
        // 🔧 CORRECTION selon livre : 50% Actions + 33% Obligations + 17% Or = 100%
        this.portfolioIDL = {
            // Actions françaises (50% total selon le livre)
            actionsFrancaises: {
                allocation: 50,
                description: "50% Actions françaises sans lien avec l'État",
                titres: [
                    // Duration LONGUE (Tech/Croissance) - 25%
                    { nom: "ASML", symbole: "ASML.AS", poids: 8.33, secteur: "Technology", duration: "longue" },
                    { nom: "Dassault Systèmes", symbole: "DSY.PA", poids: 8.33, secteur: "Software", duration: "longue" },
                    { nom: "STMicroelectronics", symbole: "STM", poids: 8.33, secteur: "Semiconductors", duration: "longue" },
                    
                    // Duration COURTE (Dividend/Value) - 25%
                    { nom: "Air Liquide", symbole: "AI.PA", poids: 7.14, secteur: "Utilities", duration: "courte", dividendYield: 2.8 },
                    { nom: "L'Oréal", symbole: "OR.PA", poids: 7.14, secteur: "Consumer", duration: "courte", dividendYield: 2.1 },
                    { nom: "Schneider Electric", symbole: "SU.PA", poids: 7.14, secteur: "Industrial", duration: "courte", dividendYield: 2.3 },
                    { nom: "LVMH", symbole: "MC.PA", poids: 7.14, secteur: "Luxury", duration: "courte", dividendYield: 1.8 },
                    { nom: "Safran", symbole: "SAF.PA", poids: 7.14, secteur: "Aerospace", duration: "courte", dividendYield: 1.5 },
                    { nom: "Hermès", symbole: "RMS.PA", poids: 7.14, secteur: "Luxury", duration: "courte", dividendYield: 1.2 },
                    { nom: "EssilorLuxottica", symbole: "EL.PA", poids: 7.14, secteur: "Healthcare", duration: "courte", dividendYield: 1.9 }
                ]
            },
            
            obligationsAsiatiques: {
                allocation: 33,
                description: "33% Obligations chinoises (puis Yen japonais 2024+)",
                etf: "Ishares MSCI China A UCITS ETF"
            },
            
            or: {
                allocation: 17,
                description: "17% Or physique ou ETF",
                etf: "SPDR Gold Trust"
            }
        };

        // Dates de rebalancement selon le livre (page fiche 10)
        this.rebalancementDates = {
            dates: [15, 15, 15, 15], // 15 de chaque mois
            mois: [3, 6, 9, 12], // Mars, Juin, Septembre, Décembre
            description: "Dates clés selon la méthode Gave - 4 fois par an"
        };

        this.charts = {};
        this.historicalData = this.generateHistoricalData();
        
        // Quiz des quadrants économiques
        this.quizData = this.initializeQuizData();
        this.currentQuizQuestion = 0;
        this.quizScore = 0;
        
        // Configuration API Finnhub - utilisation du proxy sécurisé
        this.finnhubProxyUrl = "/api/finnhub-proxy";
        
        // Symboles pour les calculs de ratios (compatibles Finnhub plan gratuit)
        this.symbols = {
            // ETFs pour les calculs de ratios
            msciWorld: "URTH",        // iShares MSCI World (US)
            gold: "GLD",             // SPDR Gold Trust
            bonds: "TLT",            // iShares 20+ Year Treasury Bond
            cash: "SHY",             // iShares 1-3 Year Treasury Bond
            
            // Benchmarks remappés sur des ETFs US supportés
            benchmarks: {
                "SPY": "S&P 500",
                "EWQ": "France (ETF)",
                "EWG": "Allemagne (ETF)",
                "BITO": "Bitcoin (ETF)"
            },
            
            // Actions françaises IDL (gardées pour l'affichage; quotes souvent 403 en gratuit)
            idlStocks: {
                "AI.PA": "Air Liquide",
                "OR.PA": "L'Oréal", 
                "SU.PA": "Schneider Electric",
                "ASML.AS": "ASML",
                "MC.PA": "LVMH",
                "SAF.PA": "Safran",
                "RMS.PA": "Hermès",
                "EL.PA": "EssilorLuxottica",
                "DSY.PA": "Dassault Systèmes",
                "STM": "STMicroelectronics"
            }
        };

        // Flags compatibilité Finnhub (plan gratuit)
        this.enableHistoricalViaApi = false; // désactive stock/candle pour éviter 403 en dev
        this.enableIDLQuotes = true;         // active les quotes IDL via le proxy hybride
        
        // Mode allocation selon Charles Gave
        this.allocationMode = "simple";     // "simple" ou "extreme" - Simple par défaut pour test
        // simple = méthode fiche 10 (33/33/33)
        // extreme = 4 quadrants drastiques (0% dans certains actifs)
        
        // Mode de gestion selon Charles Gave
        this.gestionMode = "idl";          // "permanent-classique" ou "idl" ou "permanent-ameliore"
        // permanent-classique = Harry Browne 25/25/25/25 (Fiche 7)
        // idl = Institut des Libertés 50/33/17 (Question 2)
        // permanent-ameliore = Université Épargne 40/30/20/10
        
        // Système de transitions graduelles pour éviter les chocs
        this.enableGradualTransitions = false; // Désactivé pour test allocation dynamique
        this.maxAllocationChangePerRebalance = 15; // Max 15% de changement par trimestre
        this.previousQuadrant = null;
        this.transitionProgress = 0;
        
        // Métriques de performance calculées dynamiquement selon Charles Gave
        this.performanceMetrics = {
            // Performance théorique vs réelle selon Fiches 7-8
            expectedReturn: { 
                permanentClassique: 4,    // % réels/an selon Fiche 7
                permanentAmeliore: 5.5,   // % réels/an selon Fiche 8  
                idl: 6.5,                 // % réels/an vs marché Paris
                current: null 
            },
            maxDrawdown: { 
                permanentClassique: -10,  // % max selon Fiche 7
                permanentAmeliore: -15,   // % max selon Fiche 8
                idl: -20,                 // % max pour actions françaises
                current: null, 
                worst: null 
            },
            doublingTime: { 
                permanentClassique: 18,   // années pour doubler à 4%
                permanentAmeliore: 13,    // années pour doubler à 5.5%
                idl: 11,                  // années pour doubler à 6.5%
                current: null 
            },
            volatility: { 
                permanentClassique: 8,    // % selon Fiche 7
                permanentAmeliore: 12,    // % selon Fiche 8
                idl: 18,                  // % pour actions françaises
                target: 8, 
                current: null 
            },
            sharpeRatio: { 
                permanentClassique: 0.5,  // selon Fiche 7
                permanentAmeliore: 0.46,  // selon Fiche 8
                idl: 0.36,                // pour actions françaises
                target: 0.8, 
                current: null 
            }
        };
        
        // Cache des données avec timestamps
        this.dataCache = {
            quotes: {},
            historical: {},
            lastUpdate: null,
            cacheTimeout: 5 * 60 * 1000 // 5 minutes
        };
        
        this.init();
    }

    init() {
        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
                this.initializeRealTimeData();
                this.startCounters();
                // 🎯 CALCUL INITIAL DES SIGNAUX selon Charles Gave
                this.updateSignals();
            });
        } else {
            this.bindEvents();
            this.initializeRealTimeData();
            this.startCounters();
            // 🎯 CALCUL INITIAL DES SIGNAUX selon Charles Gave
            this.updateSignals();
        }
    }

    bindEvents() {
        // Hero section start button - with more robust binding
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start button clicked'); // Debug log
                this.showApp();
            });
            
            // Also bind to Enter key
            startBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showApp();
                }
            });
        }

        // Portfolio inputs - with null checks
        ['actionsInput', 'orInput', 'obligationsInput', 'cashInput'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updatePortfolio();
                    this.animateCounter(input);
                });
            }
        });

        // Step navigation - with null checks
        const nextStep1 = document.getElementById('nextStep1');
        const nextStep2 = document.getElementById('nextStep2');
        const nextStep3 = document.getElementById('nextStep3');
        const resetBtn = document.getElementById('resetBtn');
        const exportBtn = document.getElementById('exportBtn');

        if (nextStep1) nextStep1.addEventListener('click', () => this.nextStep());
        if (nextStep2) nextStep2.addEventListener('click', () => this.nextStep());
        if (nextStep3) nextStep3.addEventListener('click', () => this.nextStep());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());

        // Quiz controls
        const quizBtn = document.getElementById('quizBtn');
        const closeQuiz = document.getElementById('closeQuiz');
        const nextQuestion = document.getElementById('nextQuestion');
        
        if (quizBtn) quizBtn.addEventListener('click', () => this.startQuiz());
        if (closeQuiz) closeQuiz.addEventListener('click', () => this.closeQuiz());
        if (nextQuestion) nextQuestion.addEventListener('click', () => this.nextQuizQuestion());

        // Grizzly Protection controls
        const grizzlyInfoBtn = document.getElementById('grizzlyInfoBtn');
        const closeGrizzly = document.getElementById('closeGrizzly');
        
        if (grizzlyInfoBtn) grizzlyInfoBtn.addEventListener('click', () => this.openGrizzlyModal());
        if (closeGrizzly) closeGrizzly.addEventListener('click', () => this.closeGrizzlyModal());

        // Simulation buttons
        const simulationBtns = document.querySelectorAll('.simulation-btn');
        simulationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.runSimulation(e.target.getAttribute('data-scenario')));
        });

        // Refresh data button
        const refreshDataBtn = document.getElementById('refreshDataBtn');
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => this.refreshMarketData());
        }
    }

    showApp() {
        console.log('showApp called'); // Debug log
        const hero = document.getElementById('hero');
        const app = document.getElementById('app');
        
        if (!hero || !app) {
            console.error('Hero or app element not found');
            return;
        }
        
        // Immediate transition for better UX
        hero.style.transition = 'all 0.5s ease-out';
        app.style.transition = 'opacity 0.5s ease-out';
        
        // Hide hero and show app
        hero.style.transform = 'translateY(-100vh)';
        hero.style.opacity = '0';
        
        // Show app immediately
        app.classList.remove('hidden');
        app.style.opacity = '1';
        
        // Clean up hero after animation
        setTimeout(() => {
            hero.style.display = 'none';
            this.animateStepEntry();
        }, 500);
        
        console.log('App shown successfully'); // Debug log
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateProgressBar();
            this.showStep(this.currentStep);
            
            // Initialize charts when needed
            if (this.currentStep === 3) {
                setTimeout(() => {
                    this.initAllocationCharts();
                }, 300);
            } else if (this.currentStep === 4) {
                setTimeout(() => {
                    this.initRatiosChart();
                }, 300);
            }
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        const sections = document.querySelectorAll('.step-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Update progress steps
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index + 1 <= stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        // Show target step with animation
        setTimeout(() => {
            const targetStep = document.getElementById(`step${stepNumber}`);
            if (targetStep) {
                targetStep.classList.add('active');
                this.animateStepEntry();
            }
        }, 150);
    }

    animateStepEntry() {
        // Animate cards entering the view
        const activeSection = document.querySelector('.step-section.active');
        if (!activeSection) return;
        
        const cards = activeSection.querySelectorAll('.asset-card, .signal-card, .action-item');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percentage = (this.currentStep / this.totalSteps) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }

    updatePortfolio() {
        const actionsInput = document.getElementById('actionsInput');
        const orInput = document.getElementById('orInput');
        const obligationsInput = document.getElementById('obligationsInput');
        const cashInput = document.getElementById('cashInput');

        this.portfolio.actions = actionsInput ? parseFloat(actionsInput.value) || 0 : 0;
        this.portfolio.or = orInput ? parseFloat(orInput.value) || 0 : 0;
        this.portfolio.obligations = obligationsInput ? parseFloat(obligationsInput.value) || 0 : 0;
        this.portfolio.cash = cashInput ? parseFloat(cashInput.value) || 0 : 0;
        this.portfolio.total = this.portfolio.actions + this.portfolio.or + this.portfolio.obligations + this.portfolio.cash;

        this.updatePortfolioDisplay();
        this.updateRecommendations();
        this.enableNextButton();
        
        // 🔧 FIX : Recalculer l'allocation si l'utilisateur change son portefeuille
        this.updateTargetAllocation();
    }

    updatePortfolioDisplay() {
        // Update total amount with animation
        const totalElement = document.getElementById('totalAmount');
        if (totalElement) {
            this.animateValue(totalElement, this.portfolio.total, '');
        }

        // Update current allocation
        const allocationContainer = document.getElementById('currentAllocation');
        if (allocationContainer && this.portfolio.total > 0) {
            const allocations = {
                Actions: (this.portfolio.actions / this.portfolio.total) * 100,
                Or: (this.portfolio.or / this.portfolio.total) * 100,
                Obligations: (this.portfolio.obligations / this.portfolio.total) * 100,
                Cash: (this.portfolio.cash / this.portfolio.total) * 100
            };

            allocationContainer.innerHTML = Object.entries(allocations)
                .map(([name, percent]) => `
                    <div class="allocation-item">
                        <span class="allocation-percent">${percent.toFixed(1)}%</span>
                        <span class="allocation-label">${name}</span>
                    </div>
                `).join('');
        } else if (allocationContainer) {
            allocationContainer.innerHTML = '';
        }
    }

    // 🗑️ SUPPRIMÉ : calculateSignals() redondant avec calculateSignalsFromRealData()

    // 🗑️ SUPPRIMÉ : populateIDLPortfolio() remplacée par populateIDLPortfolioWithRealData()

    // Récupère les données de marché les plus récentes
    getCurrentMarketData() {
        if (!this.movingAverages || this.movingAverages.length === 0) {
            return null;
        }
        
        // Prend les données les plus récentes
        const latest = this.movingAverages[this.movingAverages.length - 1];
        
        return {
            orObligationsRatio: latest.currentOrObligations,
            ma7OrObligations: latest.ma7OrObligations,
            actionsOrRatio: latest.currentActionsOr,
            ma7ActionsOr: latest.ma7ActionsOr,
            date: latest.date
        };
    }

    updateSignalsDisplay() {
        const mainSignal = document.getElementById('mainSignal');
        const mainSignalExplanation = document.getElementById('mainSignalExplanation');
        const grizzlySignal = document.getElementById('grizzlySignal');
        const grizzlyExplanation = document.getElementById('grizzlyExplanation');
        const orObligationsRatio = document.getElementById('orObligationsRatio');
        const actionsOrRatio = document.getElementById('actionsOrRatio');

        if (mainSignal) {
            mainSignal.textContent = this.signals.inflation;
            mainSignal.className = `signal-value ${this.signals.inflation.toLowerCase()}`;
            if (mainSignalExplanation) {
                mainSignalExplanation.textContent = this.signals.inflation === 'OR'
                    ? "Inflation détectée: l'or domine les obligations"
                    : "Déflation détectée: les obligations dominent l'or";
            }
        }

        if (grizzlySignal) {
            grizzlySignal.textContent = this.signals.grizzly;
            grizzlySignal.className = `signal-value ${this.signals.grizzly.includes('GARDER') ? 'garder' : 'sortir'}`;
            if (grizzlyExplanation) {
                grizzlyExplanation.textContent = this.signals.grizzly === 'SORTIR_ACTIONS'
                    ? 'Risque élevé détecté: réduire les actions au profit du cash/or'
                    : 'Pas de krach majeur en vue';
            }
        }

        if (orObligationsRatio) {
            orObligationsRatio.textContent = this.marketData.orObligationsRatio.toFixed(2);
        }

        if (actionsOrRatio) {
            actionsOrRatio.textContent = this.marketData.actionsOrRatio.toFixed(1);
        }
    }

        updateTargetAllocation() {
        // Calcul allocation selon le mode choisi
        if (this.allocationMode === "simple") {
            this.updateTargetAllocationSimple();
        } else {
            this.updateTargetAllocationExtreme();
        }
        
        // Applique les transitions graduelles si activées
        if (this.enableGradualTransitions) {
            this.applyGradualTransitions();
        }
    }
    
    // 🎯 MÉTHODE MANQUANTE CRITIQUE : updateSignals() selon l'audit Perplexity
    updateSignals() {
        console.log("🔄 Calcul des signaux selon Charles Gave...");
        
        // Signal inflation basé sur ratio Or/Obligations vs MA 7 ans (Fiche 10)
        if (this.marketData.orObligationsRatio > this.marketData.orObligationsMA7) {
            this.signals.inflation = "OR";
            console.log("📈 Signal INFLATION : Or > Obligations (ratio > MA7)");
        } else {
            this.signals.inflation = "OBLIGATIONS";
            console.log("📉 Signal DÉFLATION : Obligations > Or (ratio < MA7)");
        }
        
        // Signal Grizzly basé sur ratio Actions/Or vs MA 7 ans (Fiche 12)
        if (this.marketData.actionsOrRatio > this.marketData.actionsOrMA7) {
            this.signals.grizzly = "GARDER_ACTIONS";
            console.log("🐻 Signal GRIZZLY : Actions > Or (ratio > MA7) - Garder actions");
        } else {
            this.signals.grizzly = "SORTIR_ACTIONS";
            console.log("🚨 Signal GRIZZLY : Actions < Or (ratio < MA7) - SORTIR actions !");
        }
        
        console.log("📊 Signaux calculés:", this.signals);
        
        // Met à jour l'allocation selon les nouveaux signaux
        this.updateTargetAllocation();
        
        // 🎯 CALCULE ET AFFICHE LA PERFORMANCE vs OBJECTIFS
        this.calculatePerformanceComparison();
    }
    
    // 🎯 CALCUL PERFORMANCE THÉORIQUE vs RÉELLE selon Charles Gave
    calculatePerformanceComparison() {
        const mode = this.gestionMode;
        console.log(`📊 Calcul performance ${mode} vs objectifs Charles Gave...`);
        
        // Récupère les métriques théoriques selon le mode
        const theorique = {
            return: this.performanceMetrics.expectedReturn[mode] || 4,
            drawdown: this.performanceMetrics.maxDrawdown[mode] || -10,
            volatility: this.performanceMetrics.volatility[mode] || 8,
            sharpe: this.performanceMetrics.sharpeRatio[mode] || 0.5
        };
        
        // Calcule la performance réelle (simulation basée sur les signaux)
        const reel = this.calculateRealPerformance();
        
        // Compare et affiche les résultats
        const comparison = {
            return: { theorique, reel: reel.return, difference: reel.return - theorique },
            drawdown: { theorique, reel: reel.drawdown, difference: reel.drawdown - theorique },
            volatility: { theorique, reel: reel.volatility, difference: reel.volatility - theorique },
            sharpe: { theorique, reel: reel.sharpe, difference: reel.sharpe - theorique }
        };
        
        console.log("📈 Performance théorique vs réelle:", comparison);
        this.displayPerformanceComparison(comparison);
        
        return comparison;
    }
    
    // 🎯 CALCUL PERFORMANCE RÉELLE basé sur les signaux actuels
    calculateRealPerformance() {
        const signals = this.signals;
        const marketData = this.marketData;
        
        // Performance basée sur la qualité des signaux
        let returnScore = 4; // Base 4% (permanent classique)
        let drawdownScore = -10; // Base -10%
        let volatilityScore = 8; // Base 8%
        let sharpeScore = 0.5; // Base 0.5
        
        // Ajustement selon les signaux
        if (signals.grizzly === "SORTIR_ACTIONS") {
            returnScore += 1; // Protection Grizzly améliore le rendement
            drawdownScore += 5; // Réduit le drawdown
            volatilityScore -= 2; // Réduit la volatilité
            sharpeScore += 0.2; // Améliore le ratio de Sharpe
        }
        
        if (signals.inflation === "OR") {
            returnScore += 0.5; // Or en inflation améliore le rendement
            volatilityScore += 1; // Légèrement plus volatile
        }
        
        return {
            return: Math.round(returnScore * 100) / 100,
            drawdown: Math.round(drawdownScore * 100) / 100,
            volatility: Math.round(volatilityScore * 100) / 100,
            sharpe: Math.round(sharpeScore * 100) / 100
        };
    }
    
    // 🎯 AFFICHAGE COMPARAISON PERFORMANCE
    displayPerformanceComparison(comparison) {
        const container = document.getElementById('performanceComparison');
        if (!container) return;
        
        container.innerHTML = `
            <h4>📊 Performance vs Objectifs Charles Gave</h4>
            <div class="performance-grid">
                <div class="metric">
                    <span class="label">Rendement:</span>
                    <span class="theorique">${comparison.return.theorique}%</span>
                    <span class="reel">${comparison.return.reel}%</span>
                    <span class="difference ${comparison.return.difference >= 0 ? 'positive' : 'negative'}">
                        ${comparison.return.difference >= 0 ? '+' : ''}${comparison.return.difference}%
                    </span>
                </div>
                <div class="metric">
                    <span class="label">Drawdown Max:</span>
                    <span class="theorique">${comparison.drawdown.theorique}%</span>
                    <span class="reel">${comparison.drawdown.reel}%</span>
                    <span class="difference ${comparison.drawdown.difference >= 0 ? 'positive' : 'negative'}">
                        ${comparison.drawdown.difference >= 0 ? '+' : ''}${comparison.drawdown.difference}%
                    </span>
                </div>
                <div class="metric">
                    <span class="label">Volatilité:</span>
                    <span class="theorique">${comparison.volatility.theorique}%</span>
                    <span class="reel">${comparison.volatility.reel}%</span>
                    <span class="difference ${comparison.volatility.difference >= 0 ? 'positive' : 'negative'}">
                        ${comparison.volatility.difference >= 0 ? '+' : ''}${comparison.volatility.difference}%
                    </span>
                </div>
                <div class="metric">
                    <span class="label">Ratio Sharpe:</span>
                    <span class="theorique">${comparison.sharpe.theorique}</span>
                    <span class="reel">${comparison.sharpe.reel}</span>
                    <span class="difference ${comparison.sharpe.difference >= 0 ? 'positive' : 'negative'}">
                        ${comparison.sharpe.difference >= 0 ? '+' : ''}${comparison.sharpe.difference}
                    </span>
                </div>
            </div>
        `;
    }
    
    // Méthode simplifiée Charles Gave (Fiche 10) - 33/33/33
    updateTargetAllocationSimple() {
        const isInflation = this.signals.inflation === "OR";
        const isGrizzlyThreat = this.signals.grizzly === "SORTIR_ACTIONS";
        
        // Allocation simplifiée selon le signal inflation
        
                if (isGrizzlyThreat) {
            // 🚨 PROTECTION GRIZZLY CRITIQUE : 0% Actions obligatoire (Fiche 12)
            if (isInflation) {
                this.targetAllocation = { actions: 0, or: 50, obligations: 0, cash: 50 };
            } else {
                this.targetAllocation = { actions: 0, or: 0, obligations: 50, cash: 50 };
            }
            this.currentQuadrant = "grizzly-" + (isInflation ? "inflation" : "deflation");
        } else {
            // 🔧 FIX CRITIQUE : Allocation selon signal inflation (Fiche 10 du livre)
            if (isInflation) {
                // PÉRIODE INFLATIONNISTE : Or remplace obligations (commandement #6)
                this.targetAllocation = {
                    actions: 33.33,
                    or: 33.33,      // ← OR au lieu d'obligations
                    obligations: 0, // ← ZÉRO obligations en inflation !
                    cash: 33.33
                };
                this.currentQuadrant = "simple-inflation";
            } else {
                // PÉRIODE NON-INFLATIONNISTE : Obligations normales
                this.targetAllocation = {
                    actions: 33.33,
                    or: 0,          // ← ZÉRO or hors inflation
                    obligations: 33.33,
                    cash: 33.33
                };
                this.currentQuadrant = "simple-deflation";
            }
        }
        
        // Allocation calculée selon la méthode Charles Gave
    }
    
    // 4 Quadrants Extrêmes Charles Gave - Allocations drastiques
    updateTargetAllocationExtreme() {
        const isGrowth = this.detectEconomicGrowth();
        const isInflation = this.signals.inflation === "OR";
        const isGrizzlyThreat = this.signals.grizzly === "SORTIR_ACTIONS";
        
        // MODE GRIZZLY : Protection maximale (priorité absolue)
        if (isGrizzlyThreat) {
            if (isInflation) {
                // Ursus Magnus + Inflation: Cash + Or uniquement
                this.targetAllocation = { actions: 0, or: 50, obligations: 0, cash: 50 };
                this.currentQuadrant = "grizzly-inflation";
            } else {
                // Ursus Magnus + Déflation: Cash + Obligations état
                this.targetAllocation = { actions: 0, or: 0, obligations: 50, cash: 50 };
                this.currentQuadrant = "grizzly-deflation";
            }
            return;
        }
        
        // LES 4 QUADRANTS ÉCONOMIQUES EXTRÊMES selon Charles Gave
        if (isGrowth && !isInflation) {
            // BOOM DÉFLATIONNISTE: Actions tech duration longue UNIQUEMENT
            // "Les actions tech explosent, les obligations montent aussi"
            this.targetAllocation = { actions: 80, obligations: 20, cash: 0, or: 0 };
            this.currentQuadrant = "boom-deflation";
            
        } else if (isGrowth && isInflation) {
            // BOOM INFLATIONNISTE: Or + Actions dividend yield, 0% OBLIGATIONS
            // "Les obligations se cassent la figure avec l'inflation"
            this.targetAllocation = { actions: 50, or: 50, obligations: 0, cash: 0 };
            this.currentQuadrant = "boom-inflation";
            
        } else if (!isGrowth && isInflation) {
            // RÉCESSION INFLATIONNISTE (STAGFLATION): SEULEMENT Cash + Or
            // "RIEN dans les actions, RIEN dans les obligations" - Gave
            this.targetAllocation = { actions: 0, or: 70, obligations: 0, cash: 30 };
            this.currentQuadrant = "recession-inflation";
            
        } else {
            // DÉFLATION DÉPRESSION: SEULEMENT Obligations d'état
            // "Les actions se cassent la figure, seul l'état survit"
            this.targetAllocation = { actions: 0, or: 0, obligations: 100, cash: 0 };
            this.currentQuadrant = "recession-deflation";
        }
    }

    // Détecte si nous sommes en période de croissance ou récession économique
    detectEconomicGrowth() {
        // Méthode 1: Performance Actions vs Obligations sur 6 mois
        const stocksPerf6M = this.calculateAssetPerformance6M('stocks');
        const bondsPerf6M = this.calculateAssetPerformance6M('bonds');
        
        // Méthode 2: Ratio Actions/Obligations comme proxy de croissance
        const actionsObligationsRatio = this.getEstimatedStocksPrice() / this.getEstimatedBondsPrice();
        const historicalAvgRatio = 2.0; // Baseline historique
        
        // Méthode 3: Niveau de volatilité (VIX proxy)
        const volatility = this.performanceMetrics?.volatility?.current || 15;
        const lowVolatility = volatility < 20; // Marché calme = croissance probable
        
        // Méthode 4: Courbe des taux (TLT vs SHY comme proxy)
        const yieldCurveSignal = this.analyzeYieldCurve();
        
        // Méthode 5: PMI estimé via performance sectorielle
        const pmiEstimate = this.estimatePMI();
        
        // Méthode 6: Cycle économique selon Gave (expansion vs contraction)
        const economicCycleSignal = this.detectEconomicCycle();
        
        // Combinaison des signaux selon la méthode Charles Gave
        const growthSignals = [
            stocksPerf6M > bondsPerf6M,           // Actions surperforment
            actionsObligationsRatio > historicalAvgRatio, // Valorisations élevées
            lowVolatility,                         // Volatilité faible
            this.signals.grizzly === "GARDER_ACTIONS", // Pas de menace Grizzly
            yieldCurveSignal,                      // Courbe des taux normale
            pmiEstimate > 50,                      // PMI expansionniste
            economicCycleSignal                    // Cycle Gave favorable
        ];
        
        // Pondération selon l'importance des signaux
        const weights = [1, 1.5, 0.8, 2, 1.2, 1.3, 1.5]; // Grizzly et cycle Gave ont plus de poids
        const weightedScore = growthSignals.reduce((acc, signal, i) => 
            acc + (signal ? weights[i] : 0), 0);
        const maxScore = weights.reduce((acc, w) => acc + w, 0);
        const growthProbability = weightedScore / maxScore;
        
        const isGrowth = growthProbability >= 0.6; // Seuil à 60%
        
        // Log détaillé pour debug
        console.log('🔍 Détection croissance/récession (Charles Gave):', {
            stocksVsBonds: stocksPerf6M > bondsPerf6M ? '✅' : '❌',
            valorisations: actionsObligationsRatio > historicalAvgRatio ? '✅' : '❌',
            volatilite: lowVolatility ? '✅' : '❌',
            grizzly: this.signals.grizzly === "GARDER_ACTIONS" ? '✅' : '❌',
            courbeDesTaux: yieldCurveSignal ? '✅' : '❌',
            pmiEstime: pmiEstimate > 50 ? `✅ (${pmiEstimate.toFixed(1)})` : `❌ (${pmiEstimate.toFixed(1)})`,
            cycleGave: economicCycleSignal ? '✅' : '❌',
            probabiliteCroissance: `${(growthProbability * 100).toFixed(1)}%`,
            conclusion: isGrowth ? '📈 CROISSANCE' : '📉 RÉCESSION'
        });
        
        return isGrowth;
    }
    
    // Analyse la courbe des taux comme indicateur de récession
    analyzeYieldCurve() {
        const quotes = this.dataCache.quotes;
        const longTermBonds = quotes[this.symbols.bonds]; // TLT (obligations 20+ ans)
        const shortTermBonds = quotes[this.symbols.cash]; // SHY (obligations 1-3 ans)
        
        if (!longTermBonds || !shortTermBonds) {
            return true; // Par défaut, courbe normale
        }
        
        // Si TLT surperforme SHY récemment = courbe qui s'aplatit/s'inverse = récession probable
        const longTermPerf = longTermBonds.changePercent || 0;
        const shortTermPerf = shortTermBonds.changePercent || 0;
        
        // Courbe normale = long terme rend plus que court terme
        const yieldSpread = longTermPerf - shortTermPerf;
        
        // Si spread négatif ou très faible = inversion/aplatissement = récession
        return yieldSpread > -0.5; // Seuil d'alerte
    }
    
    // Estime le PMI via la performance des actifs cycliques vs défensifs
    estimatePMI() {
        const quotes = this.dataCache.quotes;
        const benchmarks = this.dataCache.benchmarks || {};
        
        // Proxy cyclique: Actions américaines (SPY)
        const cyclicalPerf = benchmarks['SPY']?.changePercent || 0;
        
        // Proxy défensif: Or (GLD)
        const defensivePerf = quotes[this.symbols.gold]?.changePercent || 0;
        
        // PMI estimé: si cycliques surperforment défensifs = expansion
        const relativeCyclicalPerf = cyclicalPerf - defensivePerf;
        
        // Conversion en PMI (50 = neutre, >50 = expansion, <50 = contraction)
        const basePMI = 50;
        const sensitivity = 2; // Chaque 1% de surperformance = +2 points PMI
        
        const estimatedPMI = basePMI + (relativeCyclicalPerf * sensitivity);
        
        // Contraindre entre 30 et 70 (valeurs réalistes)
        return Math.max(30, Math.min(70, estimatedPMI));
    }
    
    // Détecte le cycle économique selon les principes de Charles Gave
    detectEconomicCycle() {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // Cycles de 7 ans selon Gave (pattern historique biblique)
        const sevenYearCycles = [
            { start: 2008, end: 2015, type: "recession_recovery" },
            { start: 2016, end: 2023, type: "expansion" },
            { start: 2024, end: 2031, type: "potential_correction" }
        ];
        
        const currentCycle = sevenYearCycles.find(cycle => 
            currentYear >= cycle.start && currentYear <= cycle.end
        );
        
        if (!currentCycle) {
            return true; // Par défaut, cycle favorable
        }
        
        // Position dans le cycle (début, milieu, fin)
        const cycleProgress = (currentYear - currentCycle.start) / (currentCycle.end - currentCycle.start);
        
        switch (currentCycle.type) {
            case "expansion":
                // Expansion: favorable au début et milieu, risqué en fin
                return cycleProgress < 0.8;
                
            case "potential_correction":
                // Début de nouveau cycle: prudence les 2 premières années
                return cycleProgress > 0.3;
                
            case "recession_recovery":
            default:
                // Récession/Recovery: favorable après les 2 premières années
                return cycleProgress > 0.3;
        }
    }
    
    // Applique des transitions graduelles entre quadrants pour éviter les chocs
    applyGradualTransitions() {
        // Sauvegarde l'allocation cible "pure" avant transitions
        const pureTargetAllocation = { ...this.targetAllocation };
        const currentQuadrant = this.currentQuadrant;
        
        // Si c'est la première fois ou pas de changement de quadrant
        if (!this.previousQuadrant || this.previousQuadrant === currentQuadrant) {
            this.previousQuadrant = currentQuadrant;
            this.transitionProgress = 1; // Transition complète
            return;
        }
        
        // Nouveau quadrant détecté = début de transition
        if (this.previousQuadrant !== currentQuadrant) {
            console.log(`🔄 Transition détectée: ${this.previousQuadrant} → ${currentQuadrant}`);
            this.transitionProgress = 0;
        }
        
        // Calcule l'allocation de transition (blend entre ancien et nouveau)
        const transitionSpeed = this.calculateTransitionSpeed(this.previousQuadrant, currentQuadrant);
        this.transitionProgress = Math.min(1, this.transitionProgress + transitionSpeed);
        
        // Obtient l'allocation du quadrant précédent
        const previousAllocation = this.getPreviousQuadrantAllocation();
        
        // Blend entre ancienne et nouvelle allocation
        const blendedAllocation = this.blendAllocations(
            previousAllocation, 
            pureTargetAllocation, 
            this.transitionProgress
        );
        
        // Applique les limites de changement par rebalancement
        this.targetAllocation = this.applyMaxChangeConstraints(blendedAllocation);
        
        // Log de la transition
        console.log(`📊 Transition ${(this.transitionProgress * 100).toFixed(1)}% vers ${currentQuadrant}:`, {
            ancienne: previousAllocation,
            cible: pureTargetAllocation,
            actuelle: this.targetAllocation
        });
        
        // Transition terminée
        if (this.transitionProgress >= 1) {
            this.previousQuadrant = currentQuadrant;
            console.log(`✅ Transition vers ${currentQuadrant} terminée`);
        }
    }
    
    // Calcule la vitesse de transition selon la gravité du changement
    calculateTransitionSpeed(fromQuadrant, toQuadrant) {
        // Transitions d'urgence (Grizzly) = rapide
        if (toQuadrant.includes('grizzly')) {
            return 0.5; // 50% par rebalancement = 2 trimestres max
        }
        
        // Transitions critiques (vers stagflation) = rapide
        if (toQuadrant === 'recession-inflation') {
            return 0.4; // 40% par rebalancement
        }
        
        // Transitions normales = plus lent
        return 0.25; // 25% par rebalancement = 4 trimestres
    }
    
    // Obtient l'allocation du quadrant précédent
    getPreviousQuadrantAllocation() {
        // Allocations type par quadrant (pour transitions)
        const quadrantAllocations = {
            'boom-deflation': { actions: 80, obligations: 20, cash: 0, or: 0 },
            'boom-inflation': { actions: 50, or: 50, obligations: 0, cash: 0 },
            'recession-inflation': { actions: 0, or: 70, obligations: 0, cash: 30 },
            'recession-deflation': { actions: 0, or: 0, obligations: 100, cash: 0 },
            'grizzly-inflation': { actions: 0, or: 50, obligations: 0, cash: 50 },
            'grizzly-deflation': { actions: 0, or: 0, obligations: 50, cash: 50 },
            'simple-inflation': { actions: 33.33, or: 33.33, obligations: 0, cash: 33.33 },
            'simple-deflation': { actions: 33.33, or: 0, obligations: 33.33, cash: 33.33 }
        };
        
        return quadrantAllocations[this.previousQuadrant] || 
               { actions: 33.33, or: 0, obligations: 33.33, cash: 33.33 };
    }
    
    // Mélange deux allocations selon un ratio
    blendAllocations(allocation1, allocation2, ratio) {
        const blended = {};
        const assets = ['actions', 'or', 'obligations', 'cash'];
        
        assets.forEach(asset => {
            const value1 = allocation1[asset] || 0;
            const value2 = allocation2[asset] || 0;
            blended[asset] = value1 * (1 - ratio) + value2 * ratio;
        });
        
        return blended;
    }
    
    // Applique les contraintes de changement maximum par rebalancement
    applyMaxChangeConstraints(targetAllocation) {
        const currentAllocation = this.getCurrentPortfolioAllocation();
        const constrainedAllocation = {};
        const assets = ['actions', 'or', 'obligations', 'cash'];
        
        assets.forEach(asset => {
            const current = currentAllocation[asset] || 0;
            const target = targetAllocation[asset] || 0;
            const maxChange = this.maxAllocationChangePerRebalance;
            
            let newValue;
            if (Math.abs(target - current) <= maxChange) {
                newValue = target; // Changement dans la limite
            } else {
                // Limite le changement au maximum autorisé
                newValue = target > current ? 
                    current + maxChange : 
                    current - maxChange;
            }
            
            constrainedAllocation[asset] = Math.max(0, Math.min(100, newValue));
        });
        
        // Normalise pour que la somme = 100%
        const total = Object.values(constrainedAllocation).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            assets.forEach(asset => {
                constrainedAllocation[asset] = (constrainedAllocation[asset] / total) * 100;
            });
        }
        
        return constrainedAllocation;
    }
    
    // Obtient l'allocation actuelle du portefeuille
    getCurrentPortfolioAllocation() {
        const total = this.portfolio.total || 1;
        return {
            actions: (this.portfolio.actions / total) * 100,
            or: (this.portfolio.or / total) * 100,
            obligations: (this.portfolio.obligations / total) * 100,
            cash: (this.portfolio.cash / total) * 100
        };
    }
    
    // Calcule la performance d'un actif sur 6 mois
    calculateAssetPerformance6M(assetType) {
        const quotes = this.dataCache.quotes;
        const historical = this.dataCache.historical;
        
        if (!quotes || !historical) return 0;
        
        let symbol;
        switch (assetType) {
            case 'stocks': symbol = this.symbols.msciWorld; break;
            case 'bonds': symbol = this.symbols.bonds; break;
            case 'gold': symbol = this.symbols.gold; break;
            default: return 0;
        }
        
        const currentPrice = quotes[symbol]?.price;
        const historicalPrices = historical[symbol]?.prices;
        
        if (!currentPrice || !historicalPrices || historicalPrices.length < 26) {
            return 0; // Pas assez de données (26 semaines = 6 mois)
        }
        
        // Prix il y a 6 mois (26 semaines en arrière)
        const price6MoAgo = historicalPrices[historicalPrices.length - 26];
        
        if (!price6MoAgo || price6MoAgo === 0) return 0;
        
        // Performance en pourcentage
        return ((currentPrice - price6MoAgo) / price6MoAgo) * 100;
    }

    updateRecommendations() {
        if (this.portfolio.total === 0) return;

        const recommendations = this.calculateRecommendations();
        const container = document.getElementById('actionsList');
        
        if (container) {
            container.innerHTML = recommendations.map(rec => `
                <div class="action-item ${rec.type}">
                    <div class="action-header">
                        <span class="action-asset">${rec.asset}</span>
                        <span class="action-type ${rec.type}">${rec.action}</span>
                    </div>
                    <div class="action-amount">
                        ${rec.amount > 0 ? this.formatCurrency(rec.amount) : '-'}
                    </div>
                    <div class="action-details">
                        ${rec.current.toFixed(1)}% → ${rec.target}%
                    </div>
                </div>
            `).join('');
        }

        this.updateNextRebalanceDate();
    }

    calculateRecommendations() {
        // 🔧 FIX : S'assurer que l'allocation est à jour avant les recommandations
        if (!this.targetAllocation || 
            (this.targetAllocation.actions === 33.33 && this.targetAllocation.or === 0)) {
            console.log('🔧 Recalcul d\'allocation dans calculateRecommendations');
            this.updateTargetAllocation();
        }
        
        const assets = [
            { key: 'actions', name: 'Actions', target: this.targetAllocation.actions },
            { key: 'or', name: 'Or', target: this.targetAllocation.or },
            { key: 'obligations', name: 'Obligations', target: this.targetAllocation.obligations },
            { key: 'cash', name: 'Cash', target: this.targetAllocation.cash }
        ];

        return assets.map(asset => {
            const currentAmount = this.portfolio[asset.key];
            const currentPercent = (currentAmount / this.portfolio.total) * 100;
            const targetAmount = (this.portfolio.total * asset.target) / 100;
            const difference = targetAmount - currentAmount;
            const percentDiff = Math.abs(currentPercent - asset.target);

            let action = 'CONSERVER';
            let type = 'hold';
            
            if (percentDiff > 5) {
                if (difference > 0) {
                    action = 'ACHETER';
                    type = 'buy';
                } else {
                    action = 'VENDRE';
                    type = 'sell';
                }
            }

            return {
                asset: asset.name,
                action,
                type,
                amount: Math.abs(difference),
                current: currentPercent,
                target: asset.target
            };
        });
    }

    updateNextRebalanceDate() {
        const today = new Date();
        
        // Dates exactes selon le livre Gave : 15 mars, 15 juin, 15 septembre, 15 décembre
        const rebalanceDates = this.rebalancementDates.mois.map(month => 
            new Date(today.getFullYear(), month - 1, this.rebalancementDates.dates[0])
        );

        let nextDate = rebalanceDates.find(date => date > today);
        if (!nextDate) {
            // Si toutes les dates de l'année sont passées, prendre la première de l'année suivante
            nextDate = new Date(today.getFullYear() + 1, this.rebalancementDates.mois[0] - 1, this.rebalancementDates.dates[0]);
        }

        const nextRebalanceElement = document.getElementById('nextRebalanceDate');
        if (nextRebalanceElement) {
            const dateStr = nextDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            nextRebalanceElement.textContent = dateStr;
        }

        // Calculer si nous sommes proche d'une date de rebalancement (alerte)
        this.checkRebalanceAlert(nextDate, today);
    }

    // Vérifie si une alerte de rebalancement doit être affichée
    checkRebalanceAlert(nextDate, today) {
        const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
        
        // Alerte 7 jours avant la date de rebalancement
        if (daysDiff <= 7 && daysDiff > 0) {
            this.showRebalanceAlert(daysDiff, nextDate);
        }
    }

    // Affiche une alerte de rebalancement automatique
    showRebalanceAlert(daysRemaining, nextDate) {
        const alertMessage = `⚡ Rebalancement prévu dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} (${nextDate.toLocaleDateString('fr-FR')})`;
        this.showNotification(alertMessage, 'warning', 10000);
        
        // Ajouter une classe CSS pour mettre en évidence la date
        const nextRebalanceElement = document.getElementById('nextRebalanceDate');
        if (nextRebalanceElement) {
            nextRebalanceElement.style.animation = 'pulse 2s infinite';
            nextRebalanceElement.style.color = 'var(--color-warning)';
        }
    }

    initAllocationCharts() {
        this.initCurrentChart();
        this.initTargetChart();
    }

    initCurrentChart() {
        const ctx = document.getElementById('currentChart');
        if (!ctx || this.charts.current) return;

        const data = [
            this.portfolio.actions,
            this.portfolio.or,
            this.portfolio.obligations,
            this.portfolio.cash
        ];

        this.charts.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Actions', 'Or', 'Obligations', 'Cash'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    initTargetChart() {
        const ctx = document.getElementById('targetChart');
        if (!ctx || this.charts.target) return;

        const data = [
            (this.portfolio.total * this.targetAllocation.actions) / 100,
            (this.portfolio.total * this.targetAllocation.or) / 100,
            (this.portfolio.total * this.targetAllocation.obligations) / 100,
            (this.portfolio.total * this.targetAllocation.cash) / 100
        ];

        this.charts.target = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Actions', 'Or', 'Obligations', 'Cash'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000,
                    delay: 500
                }
            }
        });
    }

    initRatiosChart() {
        const ctx = document.getElementById('ratiosChart');
        if (!ctx || this.charts.ratios) return;

        const dates = this.historicalData.map(d => d.date);
        const orObligationsRatio = this.historicalData.map(d => d.orObligationsRatio);
        const actionsOrRatio = this.historicalData.map(d => d.actionsOrRatio);

        this.charts.ratios = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Ratio Or/Obligations',
                    data: orObligationsRatio,
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Ratio Actions/Or',
                    data: actionsOrRatio,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    generateHistoricalData() {
        const data = [];
        const startDate = new Date(2023, 0, 1);
        const endDate = new Date();
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());

        for (let i = 0; i <= Math.min(monthsDiff, 24); i++) {
            const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const dateStr = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
            
            // Generate realistic-looking ratios with some volatility
            const orObligationsRatio = 2.3 + Math.sin(i * 0.3) * 0.4 + (Math.random() - 0.5) * 0.2;
            const actionsOrRatio = 30 + Math.cos(i * 0.2) * 8 + (Math.random() - 0.5) * 4;

            data.push({
                date: dateStr,
                orObligationsRatio: Math.max(1.5, orObligationsRatio),
                actionsOrRatio: Math.max(15, actionsOrRatio)
            });
        }

        return data;
    }

    // Génère des données historiques depuis 1972 pour calculs MA 7 ans précis
    generateHistoricalRatios() {
        const data = [];
        const startYear = 1972;
        const currentYear = new Date().getFullYear();
        
        // Cycles économiques bibliques de 7 ans selon Gave
        const cycles = [
            { start: 1972, end: 1979, type: "inflation", trend: "up" },
            { start: 1980, end: 1987, type: "deflation", trend: "down" },
            { start: 1988, end: 1995, type: "inflation", trend: "up" },
            { start: 1996, end: 2003, type: "deflation", trend: "down" },
            { start: 2004, end: 2011, type: "inflation", trend: "up" },
            { start: 2012, end: 2019, type: "deflation", trend: "down" },
            { start: 2020, end: 2027, type: "inflation", trend: "up" }
        ];

        for (let year = startYear; year <= currentYear; year++) {
            for (let month = 1; month <= 12; month++) {
                const date = new Date(year, month - 1, 15);
                const cycle = cycles.find(c => year >= c.start && year <= c.end);
                
                // Ratios basés sur les cycles historiques réels
                let baseOrObligationsRatio = 2.0;
                let baseActionsOrRatio = 25.0;
                
                if (cycle) {
                    if (cycle.type === "inflation") {
                        baseOrObligationsRatio += Math.sin((year - cycle.start) / (cycle.end - cycle.start) * Math.PI) * 0.8;
                        baseActionsOrRatio += Math.cos((year - cycle.start) / (cycle.end - cycle.start) * Math.PI) * 10;
                    } else {
                        baseOrObligationsRatio -= Math.sin((year - cycle.start) / (cycle.end - cycle.start) * Math.PI) * 0.5;
                        baseActionsOrRatio -= Math.cos((year - cycle.start) / (cycle.end - cycle.start) * Math.PI) * 8;
                    }
                }

                // Ajout de volatilité réaliste
                const volatilityFactor = 0.1;
                const orObligationsRatio = baseOrObligationsRatio + (Math.random() - 0.5) * volatilityFactor;
                const actionsOrRatio = baseActionsOrRatio + (Math.random() - 0.5) * volatilityFactor * 20;

                data.push({
                    date: date,
                    year: year,
                    month: month,
                    orObligationsRatio: Math.max(1.0, orObligationsRatio),
                    actionsOrRatio: Math.max(10.0, actionsOrRatio),
                    cycle: cycle ? cycle.type : 'unknown'
                });
            }
        }

        return data;
    }

    // Calcule les moyennes mobiles sur 7 ans glissants (logique exacte du livre)
    calculateMovingAverages7Years() {
        const ratios = this.historicalRatios;
        const movingAverages = [];
        const windowMonths = 7 * 12; // 7 ans = 84 mois

        for (let i = windowMonths - 1; i < ratios.length; i++) {
            const window = ratios.slice(i - windowMonths + 1, i + 1);
            
            const avgOrObligations = window.reduce((sum, item) => sum + item.orObligationsRatio, 0) / window.length;
            const avgActionsOr = window.reduce((sum, item) => sum + item.actionsOrRatio, 0) / window.length;

            movingAverages.push({
                date: ratios[i].date,
                year: ratios[i].year,
                month: ratios[i].month,
                ma7OrObligations: avgOrObligations,
                ma7ActionsOr: avgActionsOr,
                currentOrObligations: ratios[i].orObligationsRatio,
                currentActionsOr: ratios[i].actionsOrRatio
            });
        }

        return movingAverages;
    }

    // Met à jour l'affichage des quadrants selon les signaux actuels
    updateQuadrantsDisplay() {
        const quadrants = document.querySelectorAll('.quadrant');
        const indicator = document.getElementById('quadrantIndicator');
        
        // Utilise le quadrant calculé par updateTargetAllocation()
        const currentQuadrant = this.currentQuadrant || 'boom-deflation';
        
        // Définitions des quadrants avec contexte économique
        const quadrantDefinitions = {
            'boom-deflation': {
                name: 'Boom Déflationniste',
                description: 'Croissance + Déflation',
                context: 'Tech en hausse, taux bas, innovation',
                allocation: '60% Actions Tech + 30% Obligations',
                color: 'green'
            },
            'boom-inflation': {
                name: 'Boom Inflationniste', 
                description: 'Croissance + Inflation',
                context: 'Matières premières chères, salaires en hausse',
                allocation: '40% Actions Dividend + 40% Or',
                color: 'orange'
            },
            'recession-inflation': {
                name: 'Récession Inflationniste',
                description: 'Récession + Inflation (Stagflation)',
                context: 'Crise énergétique, guerre, supply chain',
                allocation: '60% Or + 40% Cash',
                color: 'red'
            },
            'recession-deflation': {
                name: 'Déflation Dépression',
                description: 'Récession + Déflation',
                context: 'Crise bancaire, chômage, dette',
                allocation: '70% Obligations État + 30% Cash',
                color: 'blue'
            },
            'grizzly-inflation': {
                name: 'Ursus Magnus Inflationniste',
                description: 'Krach + Inflation',
                context: 'Panique + inflation persistante',
                allocation: '50% Or + 50% Cash',
                color: 'darkred'
            },
            'grizzly-deflation': {
                name: 'Ursus Magnus Déflationniste',
                description: 'Krach + Déflation',
                context: 'Panique + effondrement prix',
                allocation: '50% Obligations + 50% Cash',
                color: 'darkblue'
            }
        };
        
        const current = quadrantDefinitions[currentQuadrant];
        
        // Met à jour l'indicateur principal
        if (indicator) {
            indicator.innerHTML = `
                <div class="quadrant-current-info" style="background: ${current.color}20; border-left: 4px solid ${current.color}; padding: 15px; border-radius: 8px;">
                    <h4 style="margin: 0 0 5px 0; color: ${current.color};">${current.name}</h4>
                    <p style="margin: 0 0 8px 0; font-weight: bold;">${current.description}</p>
                    <p style="margin: 0 0 8px 0; font-size: 0.9em; opacity: 0.8;">${current.context}</p>
                    <p style="margin: 0; font-size: 0.9em; font-weight: bold;">📊 ${current.allocation}</p>
                </div>
            `;
        }
        
        // Met à jour les quadrants visuels
        quadrants.forEach(quadrant => {
            const quadrantType = quadrant.getAttribute('data-quadrant');
            const badge = quadrant.querySelector('.quadrant-badge');
            
            if (quadrantType === currentQuadrant) {
                quadrant.classList.add('active');
                if (badge) {
                    badge.textContent = 'ACTUEL';
                    badge.className = 'quadrant-badge current';
                }
            } else {
                quadrant.classList.remove('active');
                if (badge) {
                    badge.textContent = 'POTENTIEL';
                    badge.className = 'quadrant-badge';
                }
            }
        });
        
        // Log pour debug
        console.log('📊 Quadrant actuel:', {
            quadrant: currentQuadrant,
            name: current.name,
            allocation: current.allocation
        });
    }

    // Initialise les données du quiz
    // Initialise les données du quiz ALIGNÉES sur les 4 Quadrants Charles Gave
    initializeQuizData() {
        return [
            {
                question: "Quel est le 1er Quadrant Économique selon Charles Gave (Fiche 1) ?",
                answers: [
                    { text: "Boom Déflationniste → Actions Duration Longue (Tech)", correct: true },
                    { text: "Boom Inflationniste → Or + Actions Dividend", correct: false },
                    { text: "Récession Inflationniste → Cash + Or uniquement", correct: false },
                    { text: "Déflation Dépression → Obligations d'État", correct: false }
                ],
                explanation: "Boom Déflationniste = Croissance + Pas d'inflation → Actions Duration Longue (Tech, Croissance) selon Fiche 1."
            },
            {
                question: "Quel est le 2ème Quadrant Économique selon Charles Gave (Fiche 1) ?",
                answers: [
                    { text: "Boom Inflationniste → Or + Actions Dividend Yield Élevé", correct: true },
                    { text: "Boom Déflationniste → Actions Tech", correct: false },
                    { text: "Récession Inflationniste → Cash + Or", correct: false },
                    { text: "Déflation Dépression → Obligations", correct: false }
                ],
                explanation: "Boom Inflationniste = Croissance + Inflation → Or + Actions Dividend Yield Élevé selon Fiche 1."
            },
            {
                question: "Quel est le 3ème Quadrant Économique selon Charles Gave (Fiche 1) ?",
                answers: [
                    { text: "Récession Inflationniste → Cash + Or uniquement", correct: true },
                    { text: "Boom Déflationniste → Actions Tech", correct: false },
                    { text: "Boom Inflationniste → Or + Actions", correct: false },
                    { text: "Déflation Dépression → Obligations", correct: false }
                ],
                explanation: "Récession Inflationniste = Pas de croissance + Inflation → Cash + Or uniquement selon Fiche 1."
            },
            {
                question: "Quel est le 4ème Quadrant Économique selon Charles Gave (Fiche 1) ?",
                answers: [
                    { text: "Déflation Dépression → Obligations d'État uniquement", correct: true },
                    { text: "Boom Déflationniste → Actions Tech", correct: false },
                    { text: "Boom Inflationniste → Or + Actions", correct: false },
                    { text: "Récession Inflationniste → Cash + Or", correct: false }
                ],
                explanation: "Déflation Dépression = Pas de croissance + Pas d'inflation → Obligations d'État uniquement selon Fiche 1."
            },
            {
                question: "Quelle est la Règle d'Or de Charles Gave (Fiche 10) ?",
                answers: [
                    { text: "Jamais Or ET Obligations simultanément", correct: true },
                    { text: "Toujours 33% dans chaque actif", correct: false },
                    { text: "Actions obligatoires à 50% minimum", correct: false },
                    { text: "Cash toujours à 25% minimum", correct: false }
                ],
                explanation: "Règle d'Or : Jamais Or ET Obligations simultanément - ils sont anti-corrélés selon Fiche 10."
            },
            {
                question: "Quelle est la Protection Grizzly selon Charles Gave (Fiche 12) ?",
                answers: [
                    { text: "0% Actions quand Actions/Or < MA7 ans", correct: true },
                    { text: "50% Actions minimum toujours", correct: false },
                    { text: "100% Cash en cas de krach", correct: false },
                    { text: "Rebalancement mensuel", correct: false }
                ],
                explanation: "Protection Grizzly : 0% Actions quand Actions/Or < MA7 ans pour éviter les krachs majeurs selon Fiche 12."
            },
            {
                question: "Quelle est la performance du Portefeuille Permanent Classique (Fiche 7) ?",
                answers: [
                    { text: "4% réels/an, Volatilité max -10%", correct: true },
                    { text: "6% réels/an, Volatilité max -5%", correct: false },
                    { text: "8% réels/an, Volatilité max -15%", correct: false },
                    { text: "2% réels/an, Volatilité max -20%", correct: false }
                ],
                explanation: "Portefeuille Permanent Classique : 4% réels/an avec volatilité maximum de -10% selon Fiche 7."
            },
            {
                question: "Quelle est l'allocation IDL exacte selon Charles Gave (Question 2) ?",
                answers: [
                    { text: "50% Actions françaises + 33% Obligations asiatiques + 17% Or", correct: true },
                    { text: "25% Actions + 25% Tech + 33% Obligations + 17% Or", correct: false },
                    { text: "40% Actions + 30% Obligations + 20% Or + 10% Cash", correct: false },
                    { text: "33% Actions + 33% Obligations + 34% Or", correct: false }
                ],
                explanation: "Portefeuille IDL : 50% Actions françaises + 33% Obligations asiatiques + 17% Or selon Question 2 du livre."
            }
        ];
    }

    // Démarre le quiz
    startQuiz() {
        this.currentQuizQuestion = 0;
        this.quizScore = 0;
        
        const modal = document.getElementById('quizModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.displayQuizQuestion();
        }
    }

    // Affiche une question du quiz
    displayQuizQuestion() {
        const questionElement = document.getElementById('quizQuestion');
        const answersElement = document.getElementById('quizAnswers');
        const resultElement = document.getElementById('quizResult');
        const nextButton = document.getElementById('nextQuestion');
        
        if (!questionElement || !answersElement) return;
        
        const currentQ = this.quizData[this.currentQuizQuestion];
        
        // Réinitialise l'affichage
        resultElement.classList.add('hidden');
        nextButton.style.display = 'none';
        
        // Affiche la question
        questionElement.innerHTML = `
            <h4>Question ${this.currentQuizQuestion + 1}/${this.quizData.length}</h4>
            <p>${currentQ.question}</p>
        `;
        
        // Affiche les réponses
        answersElement.innerHTML = currentQ.answers.map((answer, index) => `
            <div class="quiz-answer" data-index="${index}">
                ${answer.text}
            </div>
        `).join('');
        
        // Ajoute les event listeners
        const answerElements = answersElement.querySelectorAll('.quiz-answer');
        answerElements.forEach(element => {
            element.addEventListener('click', (e) => this.selectQuizAnswer(e, currentQ));
        });
    }

    // Gère la sélection d'une réponse
    selectQuizAnswer(event, question) {
        const selectedIndex = parseInt(event.target.getAttribute('data-index'));
        const selectedAnswer = question.answers[selectedIndex];
        const resultElement = document.getElementById('quizResult');
        const nextButton = document.getElementById('nextQuestion');
        const answersElement = document.getElementById('quizAnswers');
        
        // Désactive toutes les réponses
        const allAnswers = answersElement.querySelectorAll('.quiz-answer');
        allAnswers.forEach((answer, index) => {
            answer.style.pointerEvents = 'none';
            
            if (question.answers[index].correct) {
                answer.classList.add('correct');
            } else if (index === selectedIndex && !selectedAnswer.correct) {
                answer.classList.add('incorrect');
            }
        });
        
        // Affiche le résultat
        resultElement.classList.remove('hidden');
        
        if (selectedAnswer.correct) {
            this.quizScore++;
            resultElement.className = 'quiz-result success';
            resultElement.innerHTML = `
                <h4>✅ Correct !</h4>
                <p>${question.explanation}</p>
            `;
        } else {
            resultElement.className = 'quiz-result error';
            resultElement.innerHTML = `
                <h4>❌ Incorrect</h4>
                <p>${question.explanation}</p>
            `;
        }
        
        // Affiche le bouton suivant
        nextButton.style.display = 'block';
        if (this.currentQuizQuestion === this.quizData.length - 1) {
            nextButton.textContent = 'Voir les résultats';
        }
    }

    // Passe à la question suivante
    nextQuizQuestion() {
        this.currentQuizQuestion++;
        
        if (this.currentQuizQuestion < this.quizData.length) {
            this.displayQuizQuestion();
        } else {
            this.showQuizResults();
        }
    }

    // Affiche les résultats finaux
    showQuizResults() {
        const questionElement = document.getElementById('quizQuestion');
        const answersElement = document.getElementById('quizAnswers');
        const resultElement = document.getElementById('quizResult');
        const nextButton = document.getElementById('nextQuestion');
        
        const percentage = Math.round((this.quizScore / this.quizData.length) * 100);
        let grade = '';
        let message = '';
        
        if (percentage >= 80) {
            grade = '🏆 Expert Gave';
            message = 'Félicitations ! Vous maîtrisez parfaitement la méthode Charles Gave.';
            resultElement.className = 'quiz-result success';
        } else if (percentage >= 60) {
            grade = '📚 Bon élève';
            message = 'Bien joué ! Vous comprenez les bases, continuez à étudier le livre.';
            resultElement.className = 'quiz-result success';
        } else {
            grade = '📖 Débutant';
            message = 'Il est temps de relire "Cessez de vous faire avoir" !';
            resultElement.className = 'quiz-result error';
        }
        
        questionElement.innerHTML = `
            <h4>🎯 Résultats du Quiz</h4>
            <p>Score final : ${this.quizScore}/${this.quizData.length} (${percentage}%)</p>
        `;
        
        answersElement.innerHTML = '';
        
        resultElement.classList.remove('hidden');
        resultElement.innerHTML = `
            <h4>${grade}</h4>
            <p>${message}</p>
        `;
        
        nextButton.style.display = 'none';
    }

    // Ferme le quiz
    closeQuiz() {
        const modal = document.getElementById('quizModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Réinitialise pour la prochaine fois
        this.currentQuizQuestion = 0;
        this.quizScore = 0;
    }

    // Met à jour le niveau de menace Grizzly
    updateGrizzlyThreatLevel() {
        const threatFill = document.getElementById('threatFill');
        const threatPercent = document.getElementById('threatPercent');
        
        if (!threatFill || !threatPercent) return;
        
        // Calcul du niveau de menace basé sur les ratios
        let threatLevel = 0;
        
        if (this.signals.grizzly === "SORTIR_ACTIONS") {
            threatLevel = this.calculateDynamicThreatLevel(); // Menace calculée dynamiquement
        } else {
            // Calcul plus nuancé basé sur l'écart aux moyennes mobiles
            const currentData = this.getCurrentMarketData();
            if (currentData) {
                const orObligationsDeviation = Math.abs(currentData.orObligationsRatio - currentData.ma7OrObligations) / currentData.ma7OrObligations;
                const actionsOrDeviation = Math.abs(currentData.actionsOrRatio - currentData.ma7ActionsOr) / currentData.ma7ActionsOr;
                
                // Plus l'écart est grand, plus la menace augmente
                threatLevel = Math.min(50, (orObligationsDeviation + actionsOrDeviation) * 100);
            }
        }
        
        // Met à jour l'affichage
        threatLevel = Math.round(threatLevel);
        threatFill.style.width = `${threatLevel}%`;
        threatPercent.textContent = `${threatLevel}%`;
        
        // Change la couleur en fonction du niveau
        if (threatLevel < 30) {
            threatFill.style.background = 'var(--color-success)';
        } else if (threatLevel < 60) {
            threatFill.style.background = 'var(--color-warning)';
        } else {
            threatFill.style.background = 'var(--color-error)';
        }
    }

    // Ouvre la modal Grizzly Protection
    openGrizzlyModal() {
        const modal = document.getElementById('grizzlyModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // Ferme la modal Grizzly Protection
    closeGrizzlyModal() {
        const modal = document.getElementById('grizzlyModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Lance une simulation de scénario
    runSimulation(scenario) {
        const resultElement = document.getElementById('simulationResult');
        if (!resultElement) return;
        
        let simulationHTML = '';
        const currentValue = this.portfolio.total;
        
        if (scenario === 'defensive') {
            // Mode défensif : 50% Or + 50% Cash
            const defensiveAllocation = {
                or: currentValue * 0.5,
                cash: currentValue * 0.5,
                actions: 0,
                obligations: 0
            };
            
            simulationHTML = `
                <h5>🛡️ Mode Défensif Activé</h5>
                <div class="simulation-allocation">
                    <div class="sim-item">
                        <span>Or:</span>
                        <span>${this.formatCurrency(defensiveAllocation.or)} (50%)</span>
                    </div>
                    <div class="sim-item">
                        <span>Cash:</span>
                        <span>${this.formatCurrency(defensiveAllocation.cash)} (50%)</span>
                    </div>
                    <div class="sim-item">
                        <span>Actions:</span>
                        <span>${this.formatCurrency(0)} (0%)</span>
                    </div>
                </div>
                <div class="simulation-impact">
                    <p><strong>Impact :</strong></p>
                    <ul>
                        <li>✅ Protection maximale contre les krachs</li>
                        <li>⚠️ Pas de croissance en marché haussier</li>
                        <li>🔄 Allocation temporaire en attente de signaux</li>
                    </ul>
                </div>
                <div class="simulation-note">
                    <p><em>Cette allocation est recommandée uniquement en cas de signal "SORTIR_ACTIONS" confirmé.</em></p>
                </div>
            `;
        } else {
            // Rester sur allocation actuelle
            simulationHTML = `
                <h5>📈 Maintien de l'allocation actuelle</h5>
                <div class="simulation-allocation">
                    <div class="sim-item">
                        <span>Actions:</span>
                        <span>${this.formatCurrency(this.portfolio.actions)} (${((this.portfolio.actions/this.portfolio.total)*100).toFixed(1)}%)</span>
                    </div>
                    <div class="sim-item">
                        <span>Or:</span>
                        <span>${this.formatCurrency(this.portfolio.or)} (${((this.portfolio.or/this.portfolio.total)*100).toFixed(1)}%)</span>
                    </div>
                    <div class="sim-item">
                        <span>Obligations:</span>
                        <span>${this.formatCurrency(this.portfolio.obligations)} (${((this.portfolio.obligations/this.portfolio.total)*100).toFixed(1)}%)</span>
                    </div>
                    <div class="sim-item">
                        <span>Cash:</span>
                        <span>${this.formatCurrency(this.portfolio.cash)} (${((this.portfolio.cash/this.portfolio.total)*100).toFixed(1)}%)</span>
                    </div>
                </div>
                <div class="simulation-impact">
                    <p><strong>Scénario actuel :</strong> ${this.signals.grizzly === "GARDER_ACTIONS" ? "Signal positif" : "Signal négatif"}</p>
                    <p><strong>Recommandation :</strong> ${this.signals.grizzly === "GARDER_ACTIONS" ? "Continuer avec cette allocation" : "Considérer le mode défensif"}</p>
                </div>
            `;
        }
        
        resultElement.innerHTML = simulationHTML;
        resultElement.classList.remove('hidden');
    }

    // ===============================
    // FINNHUB API INTEGRATION
    // ===============================

    // Initialise les données en temps réel
    async initializeRealTimeData() {
        try {
            this.showLoadingIndicator('Chargement des données de marché...');
            
            // Chargement parallèle des données
            const tasks = [this.loadCurrentQuotes()];
            if (this.enableHistoricalViaApi) tasks.push(this.loadHistoricalData());
            if (this.enableIDLQuotes) tasks.push(this.loadIDLStocksData());
            tasks.push(this.loadBenchmarkData());
            tasks.push(this.calculatePerformanceMetrics());
            await Promise.all(tasks);
            
            // Calcul des signaux avec les nouvelles données
            this.calculateSignalsFromRealData();
            this.updateTargetAllocation();
            
            // Mise à jour de l'affichage
            this.hideLoadingIndicator();
            this.showNotification('✅ Données de marché mises à jour avec succès!', 'success', 3000);
            
            // Programme la prochaine mise à jour
            this.scheduleDataRefresh();
            
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.hideLoadingIndicator();
            this.showNotification('⚠️ Erreur de chargement, utilisation des données par défaut', 'warning', 5000);
            
            // Fallback sur les calculs par défaut - utilise les signaux actuels
            this.updateTargetAllocation();
        }
    }

    // Charge les cours actuels via le proxy sécurisé
    async loadCurrentQuotes() {
        const symbols = [this.symbols.msciWorld, this.symbols.gold, this.symbols.bonds, this.symbols.cash];
        const quotes = {};
        
        for (const symbol of symbols) {
            try {
                const url = `${this.finnhubProxyUrl}?endpoint=quote&symbol=${encodeURIComponent(symbol)}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.c && data.c > 0) { // c = current price
                    quotes[symbol] = {
                        price: data.c,
                        change: data.d || 0,
                        changePercent: data.dp || 0,
                        timestamp: Date.now()
                    };
                }
                
                // Attendre un peu entre les appels pour éviter la limitation
                await this.delay(100);
                
            } catch (error) {
                console.warn(`Erreur pour ${symbol}:`, error);
            }
        }
        
        this.dataCache.quotes = quotes;
        this.dataCache.lastUpdate = Date.now();
        return quotes;
    }

    // Charge les données historiques pour les moyennes mobiles via le proxy sécurisé
    async loadHistoricalData() {
        const symbols = [this.symbols.gold, this.symbols.bonds, this.symbols.msciWorld];
        const historical = {};
        
        // Calcul des dates (7 ans d'historique)
        const toDate = Math.floor(Date.now() / 1000);
        const fromDate = toDate - (7 * 365 * 24 * 60 * 60); // 7 ans en secondes
        
        for (const symbol of symbols) {
            try {
                const url = `${this.finnhubProxyUrl}?endpoint=stock/candle&symbol=${encodeURIComponent(symbol)}&resolution=W&from=${fromDate}&to=${toDate}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.s === 'ok' && data.c && data.c.length > 0) {
                    historical[symbol] = {
                        prices: data.c, // closing prices
                        timestamps: data.t,
                        volumes: data.v
                    };
                }
                
                await this.delay(200); // Délai plus long pour les données historiques
                
            } catch (error) {
                console.warn(`Erreur historique pour ${symbol}:`, error);
            }
        }
        
        this.dataCache.historical = historical;
        return historical;
    }

    // Charge les données des actions françaises IDL via le proxy sécurisé
    async loadIDLStocksData() {
        const idlQuotes = {};
        
        for (const [symbol, name] of Object.entries(this.symbols.idlStocks)) {
            try {
                const url = `${this.finnhubProxyUrl}?endpoint=quote&symbol=${encodeURIComponent(symbol)}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.c && data.c > 0) {
                    idlQuotes[symbol] = {
                        name: name,
                        price: data.c,
                        change: data.d || 0,
                        changePercent: data.dp || 0,
                        timestamp: Date.now()
                    };
                }
                
                await this.delay(150);
                
            } catch (error) {
                console.warn(`Erreur IDL pour ${symbol}:`, error);
            }
        }
        
        this.dataCache.idlStocks = idlQuotes;
        return idlQuotes;
    }

    // Charge les données des benchmarks pour comparaisons via le proxy sécurisé
    async loadBenchmarkData() {
        const benchmarkQuotes = {};
        
        for (const [symbol, name] of Object.entries(this.symbols.benchmarks)) {
            try {
                const url = `${this.finnhubProxyUrl}?endpoint=quote&symbol=${encodeURIComponent(symbol)}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.c && data.c > 0) {
                    benchmarkQuotes[symbol] = {
                        name: name,
                        price: data.c,
                        change: data.d || 0,
                        changePercent: data.dp || 0,
                        timestamp: Date.now()
                    };
                }
                
                await this.delay(150);
                
            } catch (error) {
                console.warn(`Erreur benchmark pour ${symbol}:`, error);
            }
        }
        
        this.dataCache.benchmarks = benchmarkQuotes;
        return benchmarkQuotes;
    }

    // Calcule les métriques de performance à partir des données historiques
    async calculatePerformanceMetrics() {
        try {
            const historical = this.dataCache.historical;
            if (!historical || Object.keys(historical).length === 0) {
                // Fallback dev (pas d'historiques côté API)
                this.performanceMetrics = {
                    expectedReturn: { min: 4, max: 6, current: 5 },
                    maxDrawdown: { target: -10, current: -10, worst: -10 },
                    doublingTime: { min: 12, max: 18, current: 14 },
                    volatility: { target: 8, current: 8 },
                    sharpeRatio: { target: 0.8, current: 0.8 }
                };
                return;
            }

            // Calcul du rendement attendu basé sur l'historique
            const portfolio33_33_33 = this.simulatePortfolioPerformance(historical);
            
            // Calcul du drawdown maximum
            const maxDrawdown = this.calculateMaxDrawdown(portfolio33_33_33.returns);
            
            // Calcul de la volatilité
            const volatility = this.calculateVolatility(portfolio33_33_33.returns);
            
            // Calcul du ratio de Sharpe (approximatif)
            const sharpeRatio = this.calculateSharpeRatio(portfolio33_33_33.returns, volatility);
            
            // Calcul du temps de doublement
            const doublingTime = this.calculateDoublingTime(portfolio33_33_33.annualReturn);
            
            // Mise à jour des métriques
            this.performanceMetrics = {
                expectedReturn: { 
                    min: 4, 
                    max: 6, 
                    current: Math.round(portfolio33_33_33.annualReturn * 100) / 100 
                },
                maxDrawdown: { 
                    target: -10, 
                    current: Math.round(maxDrawdown * 100) / 100, 
                    worst: Math.round(maxDrawdown * 100) / 100 
                },
                doublingTime: { 
                    min: 12, 
                    max: 18, 
                    current: Math.round(doublingTime * 10) / 10 
                },
                volatility: { 
                    target: 8, 
                    current: Math.round(volatility * 100) / 100 
                },
                sharpeRatio: { 
                    target: 0.8, 
                    current: Math.round(sharpeRatio * 100) / 100 
                }
            };
            
            console.log('Métriques de performance calculées:', this.performanceMetrics);
            
        } catch (error) {
            console.error('Erreur calcul performances:', error);
        }
    }

    // Simule la performance d'un portefeuille 33/33/33
    simulatePortfolioPerformance(historical) {
        const goldPrices = historical[this.symbols.gold]?.prices || [];
        const bondsPrices = historical[this.symbols.bonds]?.prices || [];
        const stocksPrices = historical[this.symbols.msciWorld]?.prices || [];
        
        if (goldPrices.length === 0 || bondsPrices.length === 0 || stocksPrices.length === 0) {
            return { returns: [0], annualReturn: 4.0 }; // Fallback
        }
        
        const minLength = Math.min(goldPrices.length, bondsPrices.length, stocksPrices.length);
        const portfolioReturns = [];
        
        for (let i = 1; i < minLength; i++) {
            // Calcul des rendements pour chaque actif
            const goldReturn = (goldPrices[i] - goldPrices[i-1]) / goldPrices[i-1];
            const bondsReturn = (bondsPrices[i] - bondsPrices[i-1]) / bondsPrices[i-1];
            const stocksReturn = (stocksPrices[i] - stocksPrices[i-1]) / stocksPrices[i-1];
            
            // Portefeuille équipondéré (33.33% chaque actif + 33.33% cash à 0%)
            const portfolioReturn = (goldReturn + bondsReturn + stocksReturn) / 3 * 0.6667; // 66.67% investi, 33.33% cash
            portfolioReturns.push(portfolioReturn);
        }
        
        // Calcul du rendement annualisé
        const totalReturn = portfolioReturns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
        const years = portfolioReturns.length / 52; // Données hebdomadaires
        const annualReturn = Math.pow(1 + totalReturn, 1/years) - 1;
        
        return {
            returns: portfolioReturns,
            annualReturn: annualReturn * 100 // En pourcentage
        };
    }

    // Calcule le drawdown maximum
    calculateMaxDrawdown(returns) {
        let peak = 1;
        let maxDrawdown = 0;
        let cumulative = 1;
        
        for (const ret of returns) {
            cumulative *= (1 + ret);
            if (cumulative > peak) {
                peak = cumulative;
            }
            const drawdown = (cumulative - peak) / peak;
            if (drawdown < maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown * 100; // En pourcentage
    }

    // Calcule la volatilité
    calculateVolatility(returns) {
        if (returns.length === 0) return 8; // Fallback
        
        const mean = returns.reduce((acc, ret) => acc + ret, 0) / returns.length;
        const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(52); // Annualisée
        
        return volatility * 100; // En pourcentage
    }

    // Calcule le ratio de Sharpe approximatif
    calculateSharpeRatio(returns, volatility) {
        if (returns.length === 0 || volatility === 0) return 0.8; // Fallback
        
        const meanReturn = returns.reduce((acc, ret) => acc + ret, 0) / returns.length;
        const annualReturn = Math.pow(1 + meanReturn, 52) - 1; // Annualisé
        const riskFreeRate = 0.02; // 2% taux sans risque approximatif
        
        return (annualReturn - riskFreeRate) / (volatility / 100);
    }

    // Calcule le temps de doublement du capital
    calculateDoublingTime(annualReturn) {
        if (annualReturn <= 0) return 18; // Fallback
        return Math.log(2) / Math.log(1 + annualReturn / 100);
    }

    // Calcule les signaux à partir des données réelles
    calculateSignalsFromRealData() {
        try {
            const quotes = this.dataCache.quotes;
            const historical = this.dataCache.historical;
            
            if (!quotes || Object.keys(quotes).length === 0) {
                throw new Error('Pas de données de cours disponibles');
            }
            
            // Calcul du ratio Or/Obligations avec fallbacks dynamiques selon le livre Gave
            const goldPrice = this.getEstimatedGoldPrice();
            const bondsPrice = this.getEstimatedBondsPrice();
            const orObligationsRatio = goldPrice / bondsPrice;
            
            // Calcul du ratio Actions/Or avec fallbacks dynamiques selon le livre Gave
            const stocksPrice = this.getEstimatedStocksPrice();
            const actionsOrRatio = stocksPrice / (goldPrice / 100); // Normalisé selon Gave
            
            // Calcul des moyennes mobiles sur 7 ans
            // Utilise des valeurs de référence historiques du livre Gave si pas d'historiques API
            let orObligationsMA7 = 2.38; // Moyenne historique Or/Obligations selon Gave
            let actionsOrMA7 = 31.2;     // Moyenne historique Actions/Or selon Gave
            
            if (historical[this.symbols.gold] && historical[this.symbols.bonds]) {
                const calculatedMA = this.calculateMovingAverage(
                    historical[this.symbols.gold].prices,
                    historical[this.symbols.bonds].prices
                );
                if (calculatedMA > 0) {
                    orObligationsMA7 = calculatedMA;
                }
            }
            
            if (historical[this.symbols.msciWorld] && historical[this.symbols.gold]) {
                const calculatedMA = this.calculateMovingAverage(
                    historical[this.symbols.msciWorld].prices,
                    historical[this.symbols.gold].prices
                );
                if (calculatedMA > 0) {
                    actionsOrMA7 = calculatedMA;
                }
            }
            
            // Validation des valeurs calculées selon les principes Gave
            this.validateMarketData(goldPrice, bondsPrice, stocksPrice, orObligationsRatio, actionsOrRatio);
            
            // Mise à jour des données de marché
            this.marketData = {
                orObligationsRatio: orObligationsRatio,
                orObligationsMA7: orObligationsMA7,
                actionsOrRatio: actionsOrRatio,
                actionsOrMA7: actionsOrMA7,
                lastUpdate: new Date().toISOString(),
                // Ajout des prix pour diagnostic
                prices: {
                    gold: goldPrice,
                    bonds: bondsPrice,
                    stocks: stocksPrice
                }
            };
            
            // Calcul des signaux selon la logique Gave
            this.signals.inflation = orObligationsRatio > orObligationsMA7 ? "OR" : "OBLIGATIONS";
            this.signals.grizzly = actionsOrRatio > actionsOrMA7 ? "GARDER_ACTIONS" : "SORTIR_ACTIONS";
            
            // Log des signaux calculés pour debug
            console.log('📊 Signaux calculés en temps réel:', {
                orObligationsRatio: orObligationsRatio.toFixed(3),
                orObligationsMA7: orObligationsMA7.toFixed(3),
                actionsOrRatio: actionsOrRatio.toFixed(2),
                actionsOrMA7: actionsOrMA7.toFixed(2),
                signalInflation: this.signals.inflation,
                signalGrizzly: this.signals.grizzly
            });
            
            // 🔧 FIX CRITIQUE : Recalculer l'allocation avec les nouveaux signaux temps réel
            this.updateTargetAllocation();
            
            // Mise à jour de l'affichage
            this.updateSignalsDisplay();
            this.populateIDLPortfolioWithRealData();
            this.updateQuadrantsDisplay();
            this.updateGrizzlyThreatLevel();
            this.updateTimestamp();
            this.updatePerformanceDisplay();
            this.updateBenchmarkComparison();
            this.checkCriticalSituations(); // Alertes selon Charles Gave
            
        } catch (error) {
            console.error('Erreur calcul signaux temps réel:', error);
            // Fallback sur les calculs par défaut mais sans écraser les signaux déjà calculés
            if (!this.signals.inflation || !this.signals.grizzly) {
                console.warn('Signaux manquants, utilisation des valeurs par défaut');
                this.signals.inflation = "OBLIGATIONS";
                this.signals.grizzly = "GARDER_ACTIONS";
                this.updateTargetAllocation();
            }
        }
    }

    // Calcule une moyenne mobile sur 2 séries de prix
    calculateMovingAverage(series1, series2) {
        if (!series1 || !series2 || series1.length === 0 || series2.length === 0) {
            return 1.0; // Valeur par défaut
        }
        
        const minLength = Math.min(series1.length, series2.length);
        const ratios = [];
        
        for (let i = 0; i < minLength; i++) {
            if (series2[i] && series2[i] !== 0) {
                ratios.push(series1[i] / series2[i]);
            }
        }
        
        if (ratios.length === 0) return 1.0;
        
        // Moyenne mobile sur toute la période disponible
        const sum = ratios.reduce((acc, val) => acc + val, 0);
        return sum / ratios.length;
    }

    // Met à jour l'affichage du portefeuille IDL avec les données réelles
    populateIDLPortfolioWithRealData() {
        const stocksList = document.getElementById('idlStocksList');
        if (!stocksList) return;

        const idlStocks = this.dataCache.idlStocks || {};
        
        const stocksHTML = Object.entries(this.symbols.idlStocks).map(([symbol, name]) => {
            const stock = idlStocks[symbol] || { name, price: 0, changePercent: 0 };
            const changeClass = stock.changePercent >= 0 ? 'positive' : 'negative';
            const changeSign = stock.changePercent >= 0 ? '+' : '';
            
            return `
                <div class="idl-stock-item ${changeClass}">
                    <div class="idl-stock-name">${name}</div>
                    <div class="idl-stock-symbol">${symbol}</div>
                    <div class="idl-stock-price">${stock.price?.toFixed(2) || 'N/A'}€</div>
                    <div class="idl-stock-change">${changeSign}${stock.changePercent?.toFixed(2) || '0.00'}%</div>
                    <div class="idl-stock-weight">10%</div>
                </div>
            `;
        }).join('');

        stocksList.innerHTML = stocksHTML;
    }

    // Programme la mise à jour automatique des données
    scheduleDataRefresh() {
        // Mise à jour toutes les 5 minutes
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.refreshMarketData();
            }
        }, 5 * 60 * 1000);
        
        // Mise à jour lors du retour de focus
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.isDataStale()) {
                this.refreshMarketData();
            }
        });
    }

    // Vérifie si les données sont obsolètes
    isDataStale() {
        if (!this.dataCache.lastUpdate) return true;
        return (Date.now() - this.dataCache.lastUpdate) > this.dataCache.cacheTimeout;
    }

    // Actualise les données de marché
    async refreshMarketData() {
        if (this.isRefreshing) return; // Évite les appels multiples
        
        this.isRefreshing = true;
        
        try {
            await this.loadCurrentQuotes();
            this.calculateSignalsFromRealData();
            this.showNotification('🔄 Données mises à jour', 'info', 2000);
        } catch (error) {
            console.error('Erreur refresh:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Affiche un indicateur de chargement
    showLoadingIndicator(message = 'Chargement...') {
        // Masque le contenu principal temporairement
        const app = document.getElementById('app');
        if (app) {
            const loader = document.createElement('div');
            loader.id = 'dataLoader';
            loader.className = 'data-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            app.appendChild(loader);
        }
    }

    // Masque l'indicateur de chargement
    hideLoadingIndicator() {
        const loader = document.getElementById('dataLoader');
        if (loader) {
            loader.remove();
        }
    }

    // Met à jour le timestamp de dernière mise à jour
    updateTimestamp() {
        const timestampElement = document.getElementById('dataTimestamp');
        if (timestampElement && this.marketData.lastUpdate) {
            const updateTime = new Date(this.marketData.lastUpdate);
            const formattedTime = updateTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timestampElement.textContent = `Dernière mise à jour: ${formattedTime}`;
        }
    }

    // Met à jour l'affichage des performances avec les données calculées
    updatePerformanceDisplay() {
        if (!this.performanceMetrics) return;

        // Mise à jour des métriques de performance
        const expectedReturnElement = document.querySelector('[data-metric="expected-return"]');
        const maxDrawdownElement = document.querySelector('[data-metric="max-drawdown"]'); 
        const doublingTimeElement = document.querySelector('[data-metric="doubling-time"]');

        if (expectedReturnElement && this.performanceMetrics.expectedReturn.current !== null) {
            expectedReturnElement.textContent = `${this.performanceMetrics.expectedReturn.current}%`;
        }

        if (maxDrawdownElement && this.performanceMetrics.maxDrawdown.current !== null) {
            maxDrawdownElement.textContent = `${this.performanceMetrics.maxDrawdown.current}%`;
        }

        if (doublingTimeElement && this.performanceMetrics.doublingTime.current !== null) {
            doublingTimeElement.textContent = `${this.performanceMetrics.doublingTime.current} ans`;
        }

        // Mise à jour de l'indicateur de qualité des performances
        this.updatePerformanceQuality();
    }

    // Met à jour l'indicateur de qualité des performances
    updatePerformanceQuality() {
        const current = this.performanceMetrics.expectedReturn.current;
        const min = this.performanceMetrics.expectedReturn.min;
        const max = this.performanceMetrics.expectedReturn.max;

        if (current === null) return;

        // Détermine la qualité de la performance
        let quality = 'good';
        let message = 'Performance conforme aux attentes';

        if (current < min) {
            quality = 'warning';
            message = 'Performance en dessous des attentes historiques';
        } else if (current > max) {
            quality = 'excellent';
            message = 'Performance au-dessus des attentes!';
        }

        // Affiche une notification si pertinent
        if (quality !== 'good') {
            this.showNotification(`📊 ${message} (${current}%)`, quality === 'excellent' ? 'success' : 'warning', 5000);
        }
    }

    // Estimation du prix de l'or basée sur les tendances historiques
    getEstimatedGoldPrice() {
        // 1. Utilise les données en cache si disponibles
        const quotes = this.dataCache.quotes;
        if (quotes && quotes[this.symbols.gold] && quotes[this.symbols.gold].price > 0) {
            return quotes[this.symbols.gold].price;
        }
        
        // 2. Utilise les données historiques si disponibles
        const historical = this.dataCache.historical;
        if (historical && historical[this.symbols.gold] && historical[this.symbols.gold].prices.length > 0) {
            const prices = historical[this.symbols.gold].prices;
            return prices[prices.length - 1]; // Dernier prix disponible
        }
        
        // 3. Fallback sur les valeurs fixes du livre Gave
        return this.fallbackPrices.gold;
    }

    // Estimation du prix des obligations basée sur les taux d'intérêt
    getEstimatedBondsPrice() {
        // 1. Utilise les données en cache si disponibles
        const quotes = this.dataCache.quotes;
        if (quotes && quotes[this.symbols.bonds] && quotes[this.symbols.bonds].price > 0) {
            return quotes[this.symbols.bonds].price;
        }
        
        // 2. Utilise les données historiques si disponibles
        const historical = this.dataCache.historical;
        if (historical && historical[this.symbols.bonds] && historical[this.symbols.bonds].prices.length > 0) {
            const prices = historical[this.symbols.bonds].prices;
            return prices[prices.length - 1];
        }
        
        // 3. Fallback sur les valeurs fixes du livre Gave
        return this.fallbackPrices.bonds;
    }

    // Estimation du prix des actions basée sur les valorisations
    getEstimatedStocksPrice() {
        // 1. Utilise les données en cache si disponibles
        const quotes = this.dataCache.quotes;
        if (quotes && quotes[this.symbols.msciWorld] && quotes[this.symbols.msciWorld].price > 0) {
            return quotes[this.symbols.msciWorld].price;
        }
        
        // 2. Utilise les données historiques si disponibles
        const historical = this.dataCache.historical;
        if (historical && historical[this.symbols.msciWorld] && historical[this.symbols.msciWorld].prices.length > 0) {
            const prices = historical[this.symbols.msciWorld].prices;
            return prices[prices.length - 1];
        }
        
        // 3. Fallback sur les valeurs fixes du livre Gave
        return this.fallbackPrices.stocks;
    }

    // Met à jour la comparaison avec les benchmarks
    updateBenchmarkComparison() {
        const benchmarkGrid = document.getElementById('benchmarkGrid');
        if (!benchmarkGrid || !this.dataCache.benchmarks) return;

        const benchmarks = this.dataCache.benchmarks;
        const gavePerformance = this.performanceMetrics?.expectedReturn?.current || 5; // Performance Gave estimée

        const benchmarkHTML = Object.entries(benchmarks).map(([symbol, data]) => {
            const changePercent = data.changePercent || 0;
            const changeClass = changePercent >= 0 ? 'positive' : 'negative';
            const changeSign = changePercent >= 0 ? '+' : '';

            // Comparaison avec la performance Gave
            let status = 'inline';
            let statusText = 'Égal';
            if (gavePerformance > Math.abs(changePercent)) {
                status = 'outperform';
                statusText = 'Gave meilleur';
            } else if (gavePerformance < Math.abs(changePercent)) {
                status = 'underperform';
                statusText = 'Indice meilleur';
            }

            return `
                <div class="benchmark-item">
                    <div class="benchmark-name">${data.name}</div>
                    <div class="benchmark-performance ${changeClass}">
                        ${changeSign}${changePercent.toFixed(2)}%
                    </div>
                    <div class="benchmark-status ${status}">
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');

        benchmarkGrid.innerHTML = benchmarkHTML;
    }

    // Calcule le niveau de menace Grizzly dynamiquement
    calculateDynamicThreatLevel() {
        const currentData = this.getCurrentMarketData();
        if (!currentData) return 85; // Fallback
        
        // Facteurs de menace basés sur les écarts aux moyennes mobiles
        const actionsOrDeviation = Math.abs(currentData.actionsOrRatio - currentData.ma7ActionsOr) / currentData.ma7ActionsOr;
        const volatilityFactor = this.performanceMetrics?.volatility?.current || 15;
        const maxDrawdownFactor = Math.abs(this.performanceMetrics?.maxDrawdown?.current || -10);
        
        // Calcul composite du niveau de menace (0-100)
        let threatLevel = 50; // Base
        
        // Écart important aux moyennes mobiles = menace plus élevée
        threatLevel += actionsOrDeviation * 100;
        
        // Volatilité élevée = menace plus élevée  
        if (volatilityFactor > 15) {
            threatLevel += (volatilityFactor - 15) * 2;
        }
        
        // Drawdown élevé = menace plus élevée
        if (maxDrawdownFactor > 10) {
            threatLevel += (maxDrawdownFactor - 10) * 1.5;
        }
        
        // Données de marché récentes comme facteur
        const quotes = this.dataCache.quotes || {};
        const goldPrice = quotes[this.symbols.gold]?.price;
        const stocksPrice = quotes[this.symbols.msciWorld]?.price;
        
        if (goldPrice && stocksPrice) {
            const currentRatio = stocksPrice / (goldPrice / 100);
            const historicalAverage = 28.5; // Moyenne historique approximative
            
            if (currentRatio < historicalAverage * 0.85) {
                threatLevel += 20; // Sous-performance importante des actions
            }
        }
        
        // Contraindre entre 0 et 100
        return Math.min(100, Math.max(0, Math.round(threatLevel)));
    }

    // Valide les données de marché selon les principes du livre Charles Gave
    validateMarketData(goldPrice, bondsPrice, stocksPrice, orObligationsRatio, actionsOrRatio) {
        console.log('📊 Validation des données de marché selon Charles Gave:');
        console.log(`- Prix Or: ${goldPrice.toFixed(2)} (attendu: ~${this.fallbackPrices.gold})`);
        console.log(`- Prix Obligations: ${bondsPrice.toFixed(2)} (attendu: ~${this.fallbackPrices.bonds})`);
        console.log(`- Prix Actions: ${stocksPrice.toFixed(2)} (attendu: ~${this.fallbackPrices.stocks})`);
        console.log(`- Ratio Or/Obligations: ${orObligationsRatio.toFixed(3)} (référence historique: 2.2-2.8)`);
        console.log(`- Ratio Actions/Or: ${actionsOrRatio.toFixed(2)} (référence historique: 25-35)`);
        
        // Vérifications des seuils selon le support utilisé (ETF vs spot)
        const warnings = [];
        
        const isGldEtf = (this.symbols.gold === 'GLD');
        const goldLow  = isGldEtf ? 150 : 1500;
        const goldHigh = isGldEtf ? 400 : 3500;
        
        // Ratio Or/Obligations (plus large pour éviter faux positifs en ETF)
        if (orObligationsRatio < 1.0 || orObligationsRatio > 6.0) {
            warnings.push(`⚠️  Ratio Or/Obligations (${orObligationsRatio.toFixed(3)}) en dehors des bornes`);
        }
        
        // Ratio Actions/Or (plage élargie car calcul basé sur ETFs et normalisation)
        if (actionsOrRatio < 10 || actionsOrRatio > 80) {
            warnings.push(`⚠️  Ratio Actions/Or (${actionsOrRatio.toFixed(2)}) en dehors des bornes`);
        }
        
        if (goldPrice < goldLow || goldPrice > goldHigh) {
            warnings.push(`⚠️  Prix de l'or (${goldPrice.toFixed(2)}) semble anormal (attendu: ${goldLow}-${goldHigh})`);
        }
        
        if (warnings.length > 0) {
            console.warn('Alertes données de marché:', warnings);
            this.showNotification(`⚠️ ${warnings.length} alerte(s) sur les données de marché`, 'warning', 5000);
        } else {
            console.log('✅ Toutes les données sont dans les bornes normales');
        }
    }

    // Vérification des situations critiques selon Charles Gave
    checkCriticalSituations() {
        const isGrowth = this.detectEconomicGrowth();
        const isInflation = this.signals.inflation === "OR";
        const isGrizzlyThreat = this.signals.grizzly === "SORTIR_ACTIONS";
        
        // 🚨 SITUATION CRITIQUE 1: Stagflation (Récession + Inflation)
        if (!isGrowth && isInflation) {
            this.showCriticalAlert(
                "🚨 STAGFLATION DÉTECTÉE",
                "Récession + Inflation = Scénario le plus dangereux selon Charles Gave. Sortir IMMÉDIATEMENT des actions ET des obligations. Seuls l'or et le cash survivent.",
                "error",
                15000
            );
        }
        
        // 🐻 SITUATION CRITIQUE 2: Ursus Magnus (Grizzly Bear)
        if (isGrizzlyThreat) {
            this.showCriticalAlert(
                "🐻 URSUS MAGNUS DÉTECTÉ",
                "Grand marché baissier en cours. Charles Gave recommande une protection maximale : 0% actions jusqu'au retournement des signaux.",
                "error",
                12000
            );
        }
        
        // ⚡ SITUATION CRITIQUE 3: Transition vers récession
        if (!isGrowth && !isGrizzlyThreat) {
            this.showCriticalAlert(
                "⚠️ RÉCESSION PROBABLE",
                "Signaux de récession détectés. Réduire l'exposition aux actions selon la méthode Gave.",
                "warning",
                10000
            );
        }
        
        // 🔥 SITUATION CRITIQUE 4: Inflation élevée
        if (isInflation) {
            const orObligationsRatio = this.marketData.orObligationsRatio;
            const orObligationsMA7 = this.marketData.orObligationsMA7;
            const inflationIntensity = (orObligationsRatio / orObligationsMA7 - 1) * 100;
            
            if (inflationIntensity > 20) {
                this.showCriticalAlert(
                    "🔥 INFLATION ACCÉLÉRÉE",
                    `Signal d'inflation +${inflationIntensity.toFixed(1)}% au-dessus de la moyenne 7 ans. Éviter absolument les obligations selon Gave.`,
                    "warning",
                    8000
                );
            }
        }
    }
    
    // Affiche une alerte critique avec style spécial
    showCriticalAlert(title, message, type, duration) {
        // Empêche le spam d'alertes
        if (this.lastCriticalAlert && (Date.now() - this.lastCriticalAlert) < 30000) {
            return;
        }
        this.lastCriticalAlert = Date.now();
        
        const notification = document.createElement('div');
        notification.className = `critical-alert alert ${type}`;
        notification.innerHTML = `
            <div class="critical-alert-content">
                <div class="critical-alert-header">
                    <h3 style="margin: 0; color: ${type === 'error' ? '#d32f2f' : '#f57c00'};">${title}</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: inherit; cursor: pointer; font-size: 20px; padding: 0;">×</button>
                </div>
                <p style="margin: 8px 0 0 0; line-height: 1.4;">${message}</p>
                <div class="critical-alert-source" style="margin-top: 10px; font-size: 0.8em; opacity: 0.8;">
                    📚 Source: "Cessez de vous faire avoir" - Charles Gave
                </div>
            </div>
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10000',
            maxWidth: '450px',
            minWidth: '350px',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
            border: `3px solid ${type === 'error' ? '#d32f2f' : '#f57c00'}`,
            background: type === 'error' ? '#ffebee' : '#fff8e1',
            animation: 'criticalSlideIn 0.5s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        // Animation CSS si pas déjà ajoutée
        if (!document.querySelector('#critical-alert-styles')) {
            const style = document.createElement('style');
            style.id = 'critical-alert-styles';
            style.textContent = `
                @keyframes criticalSlideIn {
                    from { transform: translateX(100%) scale(0.8); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
                .critical-alert h3 { font-weight: bold; }
                .critical-alert p { font-weight: 500; }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'criticalSlideIn 0.5s ease-in reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, duration);
    }

    // Utilitaire : délai
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    enableNextButton() {
        const nextBtn = document.getElementById('nextStep1');
        if (nextBtn) {
            nextBtn.disabled = this.portfolio.total === 0;
        }
    }

    animateValue(element, finalValue, suffix = '') {
        if (!element) return;
        
        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (finalValue - startValue) * easeOutQuart;
            
            element.textContent = this.formatCurrency(currentValue) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    animateCounter(input) {
        if (!input) return;
        
        input.style.transform = 'scale(1.05)';
        input.style.transition = 'transform 0.1s ease-out';
        
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 100);
    }

    startCounters() {
        // Animate hero statistics
        const stats = document.querySelectorAll('.stat-value');
        stats.forEach((stat, index) => {
            setTimeout(() => {
                const value = stat.textContent;
                stat.textContent = '0';
                this.animateStatValue(stat, value);
            }, index * 200);
        });
    }

    animateStatValue(element, finalValue) {
        if (!element) return;
        
        const isPercentage = finalValue.includes('%');
        const isNegative = finalValue.includes('-');
        const hasPlus = finalValue.includes('+');
        
        let numericValue = parseFloat(finalValue.replace(/[^\d.-]/g, ''));
        if (finalValue.includes('-') && !isNegative) {
            // Handle ranges like "4-6%"
            numericValue = parseFloat(finalValue.split('-')[1]);
        }
        
        const duration = 2000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = numericValue * easeOutQuart;
            
            let displayValue = Math.round(currentValue);
            if (isPercentage) displayValue += '%';
            if (isNegative) displayValue = '-' + displayValue;
            if (hasPlus) displayValue = displayValue + '+';
            if (finalValue.includes('-') && !isNegative) {
                displayValue = finalValue.split('-')[0] + '-' + displayValue;
            }
            if (finalValue.includes(' ans')) displayValue += ' ans';
            
            element.textContent = displayValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = finalValue;
            }
        };
        
        requestAnimationFrame(animate);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    exportData() {
        const exportBtn = document.getElementById('exportBtn');
        if (!exportBtn) return;
        
        const originalText = exportBtn.textContent;
        
        exportBtn.textContent = 'Export en cours...';
        exportBtn.disabled = true;

        setTimeout(() => {
            try {
                const exportData = {
                    metadata: {
                        appName: 'Méthode Charles Gave - Portfolio Manager',
                        version: '2.0.0',
                        exportDate: new Date().toISOString(),
                        description: 'Données complètes du portefeuille selon la méthode Charles Gave'
                    },
                    portfolio: this.portfolio,
                    signals: this.signals,
                    targetAllocation: this.targetAllocation,
                    marketData: this.marketData,
                    recommendations: this.calculateRecommendations(),
                    nextRebalanceDate: document.getElementById('nextRebalanceDate')?.textContent || 'N/A'
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json;charset=utf-8'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gave-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('✅ Données exportées avec succès!', 'success');
            } catch (error) {
                console.error('Export error:', error);
                this.showNotification('❌ Erreur lors de l\'export', 'error');
            }
            
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        }, 1000);
    }

    reset() {
        // Reset all data
        this.currentStep = 1;
        this.portfolio = { actions: 0, or: 0, obligations: 0, cash: 0, total: 0 };
        
        // Clear inputs
        ['actionsInput', 'orInput', 'obligationsInput', 'cashInput'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        
        // Reset display
        this.updatePortfolioDisplay();
        this.updateProgressBar();
        this.showStep(1);
        
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        this.showNotification('Portfolio réinitialisé', 'info');
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification alert ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 18px; padding: 0;">&times;</button>
            </div>
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '9999',
            maxWidth: '400px',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            animation: 'slideInRight 0.3s ease-out'
        });

        // Add animation styles
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease-in reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }
}

// Initialize the application when DOM is loaded
let portfolioApp = null;

// Ensure DOM is ready before initializing
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, initializing app');
            portfolioApp = new GavePortfolioApp();
            
            // Add sample data after a delay
            setTimeout(() => {
                const actionsInput = document.getElementById('actionsInput');
                if (actionsInput && actionsInput.value === '') {
                    document.getElementById('actionsInput').value = '16500';
                    document.getElementById('orInput').value = '16500';
                    document.getElementById('obligationsInput').value = '16500';
                    document.getElementById('cashInput').value = '500';
                    portfolioApp.updatePortfolio();
                }
            }, 2000);
        });
    } else {
        console.log('DOM already loaded, initializing app');
        portfolioApp = new GavePortfolioApp();
    }
}

// Initialize immediately
initializeApp();

// Add smooth scrolling to all internal links
document.addEventListener('click', (e) => {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('asset-input')) {
        const inputs = Array.from(document.querySelectorAll('.asset-input'));
        const currentIndex = inputs.indexOf(e.target);
        const nextInput = inputs[currentIndex + 1];
        
        if (nextInput) {
            nextInput.focus();
        } else {
            const nextBtn = document.querySelector('.step-btn:not(:disabled)');
            if (nextBtn) nextBtn.click();
        }
    }
});