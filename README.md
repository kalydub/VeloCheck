# VeloCheck

![VeloCheck Mockup](./mockup.png)

VeloCheck est votre assistant ultime d'entretien vélo. Il synchronise vos trajets Strava, calcule l'usure de vos composants (chaîne, freins...), et fournit des conseils d'entretien personnalisés grâce à l'IA pour optimiser la longévité de votre monture de manière sûre.

## Démarrage rapide

1. Clonez ce dépôt.
2. Copiez `.env.example` vers `.env` (ou créez simplement un fichier `.env`) et remplissez les valeurs :
   ```
   VITE_GEMINI_API_KEY=votre_cle_api_gemini
   VITE_STRAVA_CLIENT_ID=votre_client_id_strava
   VITE_STRAVA_CLIENT_SECRET=votre_client_secret_strava
   VITE_STRAVA_REFRESH_TOKEN=votre_refresh_token_strava
   ```
3. Installez les dépendances avec `npm install`.
4. Lancez l'application ave `npm run dev`.

## Licence

Ce projet est sous licence MIT.
