# Le Carnet Gourmand

PWA de recettes pour cuisiner sur smartphone : extraction depuis YouTube, TikTok, Instagram ou un blog, conversion métrique, Mode Cuisine mains libres, carnet d'essais, fil général à faire défiler et réseau familial privé.

Stack : Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Gemini.

## Lancer en local

1. Installer les dépendances : `npm install`
2. Copier `.env.example` vers `.env.local` et le remplir (voir ci-dessous).
3. Lancer : `npm run dev`, puis ouvrir http://127.0.0.1:3000

Le service worker n'est actif qu'en production (`npm run build && npm start`).

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, Project Settings > API |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

Avec Docker, `npx supabase start` lance tout Supabase en local et applique les migrations ; ses clés s'affichent avec `npx supabase status`. Les e-mails de connexion arrivent alors dans Mailpit, sur http://127.0.0.1:54324.

Vérifications : `npm test`, `npm run lint`, `npx tsc --noEmit`, et `npm run test:rls` pour la sécurité entre comptes (Supabase local requis, comptes jetables supprimés à la fin).

## Configurer Supabase

1. Créer un projet sur https://supabase.com
2. Appliquer les migrations de `supabase/migrations/`, dans l'ordre, avec `npx supabase link` puis `npx supabase db push`. On peut aussi coller les fichiers un à un dans le SQL Editor.
3. Dans Authentication > URL Configuration, renseigner l'URL du site dans **Site URL** et ajouter `https://votre-domaine/**` dans **Redirect URLs**.
4. Dans Authentication > Email Templates > Magic Link, remplacer le lien du modèle par :

   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Ouvrir mon carnet</a>
   ```

   Cette étape compte sur Xiaomi : avec le modèle par défaut, le lien ne fonctionne que dans le navigateur qui l'a demandé. Si le mail s'ouvre dans Mi Browser alors que la demande vient de Chrome, la connexion échoue.

   `{{ .RedirectTo }}` ramène aussi un proche sur son invitation après la connexion.

5. Configurer un SMTP personnalisé (Resend, Brevo…) dans Authentication > Emails > SMTP Settings. **C'est indispensable pour une famille** : le service par défaut n'envoie qu'aux membres de l'équipe Supabase, à 2 e-mails par heure, et un nouveau projet gratuit ne peut pas modifier ses modèles sans SMTP.

Les inscriptions doivent rester ouvertes pour que les proches créent leur compte. Toute personne connaissant l'adresse du site peut donc s'inscrire et consommer le quota Gemini, sans voir aucune recette. Pour l'éviter, désactiver **Allow new users to sign up** une fois la famille au complet, et ajouter les suivants avec **Invite user** dans Authentication > Users.

Pour modifier le schéma, régénérer les types : `npx supabase gen types typescript --local > types/database.ts`

## Déployer sur Vercel

1. Importer le dépôt dans Vercel.
2. Ajouter les trois variables d'environnement.
3. Déployer, puis reporter l'URL obtenue dans la configuration Supabase (étape 3).

`maxDuration` vaut 60 s sur `/api/extract-recipe`, car une vidéo YouTube peut prendre près d'une minute à analyser.

## Installer sur Android

Ouvrir le site dans Chrome, puis menu ⋮ > **Ajouter à l'écran d'accueil**.

Sur MIUI, désactiver l'économie de batterie pour Chrome (Paramètres > Applis > Chrome > Économiseur de batterie) : elle peut couper le maintien de l'écran et le minuteur.

## Fonctionnement de l'extraction

- **YouTube** : Gemini regarde directement la vidéo, avec le titre et la description en contexte. Si la vidéo est inaccessible, l'extraction repart de ces seules métadonnées.
- **TikTok, Instagram** : oEmbed et balises OpenGraph publiques. Instagram bloque souvent ces lectures : l'application demande alors de coller la légende.
- **Blogs** : JSON-LD et texte de la page. Les URL vers des adresses internes sont refusées.

Le modèle est défini par `MODEL` dans `lib/gemini.ts`. Google retire régulièrement ses modèles : voir https://aistudio.google.com/docs/deprecations

## Fil général

La page d'accueil se fait défiler verticalement, une recette par écran. Le classement (`buildGeneralFeed` dans `lib/forYou.ts`) mêle j'aime, commentaires, fraîcheur, saison et goûts, avec une part de hasard renouvelée chaque jour.

Une recette y apparaît si son auteur clique sur « Publier pour tout le monde » et si elle a une photo. Elle devient alors lisible par tous les comptes, avec le nom et la photo de son auteur. Rien n'est lisible sans compte.

**Catalogue de départ** : `npm run seed:recipes` publie les recettes de `supabase/seed/recipes.mjs` sous un compte « Le Carnet Gourmand » sans connexion possible. Le script est relançable sans doublon. En production :

```bash
SUPABASE_SECRET_KEY=votre_cle NEXT_PUBLIC_SUPABASE_URL=votre_url node supabase/seed/seed-recipes.mjs
```

Les textes sont originaux. Les photos viennent de Wikimedia Commons sous licence libre : leur auteur et leur licence (`supabase/seed/images/credits.json`) s'affichent sur le fil et sur chaque fiche, et cette mention ne doit pas être retirée.

## Réseau familial

- **Familles** : on en crée une dans Profil, puis on invite ses proches par lien. Une personne peut appartenir à plusieurs familles.
- **Partage** : une recette reste privée jusqu'au bouton « Partager avec ma famille ». Elle devient alors visible de tous les membres de toutes ses familles, y compris celles rejointes plus tard. L'onglet Famille regroupe ce fil, les recettes de saison et celles à refaire.
- **Essais et notes** : toujours privés, même sur une recette partagée.
- **Ajouter à mon carnet** : crée une copie indépendante, photo comprise, qui survit à la suppression de l'original.
- **Modération** : l'auteur d'une recette supprime les commentaires qu'elle reçoit. Le créateur d'une famille retire un membre et renouvelle le lien d'invitation.

Les règles sont dans `supabase/migrations/003_family_network.sql` et `004_public_feed.sql`. Les photos restent dans un bucket public : leur adresse est imprévisible, mais une personne qui la connaît peut l'ouvrir sans compte.

## Hors-ligne

`public/sw.js` garde les pages consultées et les sert en cas de coupure ou si le réseau met plus de 3 s à répondre. Le réseau passe d'abord pour que commentaires et j'aime soient à jour. Lecture et Mode Cuisine fonctionnent sans réseau, pas l'ajout ni l'enregistrement. Le cache des pages est vidé à la déconnexion, et une recette qui n'est plus accessible en sort à la visite suivante.
