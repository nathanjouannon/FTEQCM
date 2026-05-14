## Architecture 

projet-naturalisation/
├── public/
├── src/
│   ├── app/                    # App Router Next.js
│   │   ├── page.tsx            # Page d'accueil (démarrer un QCM)
│   │   ├── qcm/
│   │   │   ├── page.tsx        # Déroulement du QCM (40 questions)
│   │   │   └── results/
│   │   │       └── page.tsx    # Résultats & correction
│   │   └── progression/
│   │       └── page.tsx        # Courbe de progression
│   ├── components/             # Composants React réutilisables
│   ├── data/
│   │   └── questions.json      # Toutes les questions & réponses (statique)
│   ├── hooks/
│   │   ├── useQCM.ts           # Logique du QCM (sélection, navigation)
│   │   └── useLocalStorage.ts  # Hook générique lecture/écriture LocalStorage
│   └── types/
│       └── index.ts            # Types TypeScript (Question, Score, Answer...)
├── next.config.js
└── netlify.toml     

## Flux de données
questions.json (statique)
        │
        ▼
    useQCM.ts ──── sélection aléatoire de 40 questions
        │
        ▼
   pages QCM ──── réponses utilisateur (state React)
        │
        ▼
  LocalStorage
  ┌─────────────────────────────────────────┐
  │ qcm_scores: [                           │
  │   {                                     │
  │     date: "2024-01-15",                 │
  │     score: 32,                          │
  │     total: 40,                          │
  │     mode: "immediate" | "end",          │
  │     answers: [                          │
  │       { questionId, userAnswer,         │
  │         correct: bool }                 │
  │     ]                                   │
  │   }                                     │
  │ ]                                       │
  └─────────────────────────────────────────┘