# Rang X

Une application pour téléphone qui te classe de **E à X** dans six piliers : Force, Maîtrise du corps, Vitesse (5 km), Endurance (10 km), Explosivité et Physique. Elle te donne ton programme de la semaine, compte tes répétitions avec la caméra pour battre des boss, suit tes courses (GPS et podomètre) et te compare à tes amis.

Rangs : **E** Éveil · **D** Recrue · **C** Confirmé · **B** Avancé · **A** Élite · **S** Champion · **X** Légende.

---

## 1. Mettre l'app en ligne (une seule fois)

La caméra et le GPS d'un téléphone ne marchent que sur un site en **https**. Il faut donc héberger le dossier `rang-x`. Les deux méthodes ci-dessous sont gratuites.

### Option A : GitHub Pages (permanent, recommandé)

1. Crée un compte sur github.com.
2. Clique sur **New repository**, nomme-le `rang-x`, coche **Public**, puis **Create repository**.
3. Clique sur **uploading an existing file** et glisse **tout le contenu** du dossier `rang-x` (les fichiers `index.html`, `sw.js`, `manifest.webmanifest` et les dossiers `css`, `js`, `icons`, `vendor`). Clique sur **Commit changes**.
4. Va dans **Settings → Pages**. Sous *Branch*, choisis `main` et `/ (root)`, puis **Save**.
5. Après une ou deux minutes, ton app est en ligne à l'adresse `https://TON-PSEUDO.github.io/rang-x/`.

### Option B : Netlify Drop (le plus rapide)

1. Sur un ordinateur, ouvre app.netlify.com/drop.
2. Glisse le dossier `rang-x` entier dans la page.
3. Netlify te donne une adresse en https. Crée un compte gratuit pour garder le site, sinon il est supprimé au bout d'une heure.

## 2. Installer l'app sur ton téléphone

- **iPhone (Safari)** : ouvre l'adresse, touche **Partager**, puis **Sur l'écran d'accueil**.
- **Android (Chrome)** : ouvre l'adresse, menu **⋮**, puis **Installer l'application** (ou *Ajouter à l'écran d'accueil*).

L'app s'ouvre alors en plein écran, comme une vraie application, et fonctionne hors ligne après la première ouverture. Tes données restent sur ton téléphone.

## 3. Jouer avec un ami

1. Envoie-lui l'adresse de l'app : il l'installe et fait son évaluation.
2. Dans **Classement**, touche **Partager mon profil** et envoie le code (WhatsApp, SMS…).
3. Ton ami touche **Ajouter un ami** et colle ton code. Il fait pareil dans l'autre sens.
4. Après tes progrès, renvoie ton code : son classement se met à jour.

### Option : ligue en ligne (mise à jour automatique)

Si tu ne veux plus t'échanger de codes, crée une base Firebase gratuite :

1. Va sur console.firebase.google.com, **Créer un projet** (pas besoin de Google Analytics).
2. Menu **Créer → Realtime Database → Créer une base de données**, choisis la région Europe, puis **Démarrer en mode test**.
3. Onglet **Règles** : remplace tout par ceci, puis **Publier** :

```json
{
  "rules": {
    "ligues": {
      "$ligue": {
        ".read": true,
        "$joueur": {
          ".write": true,
          ".validate": "newData.hasChildren(['id', 'n', 'g'])"
        }
      }
    }
  }
}
```

4. Copie l'adresse de la base (en haut de l'onglet *Données*, elle ressemble à `https://ton-projet-default-rtdb.europe-west1.firebasedatabase.app`).
5. Dans l'app : **Classement → Ligue en ligne → Configurer**. Colle l'adresse et choisis un code de ligue (par exemple `les-titans`). Donne les deux à tes amis.

Toute personne qui connaît l'adresse et le code peut lire la ligue : n'y mets que ton pseudo, pas ton vrai nom complet.

### Records battus hors ligne

Tu peux t'entraîner sans réseau : chaque record est gardé sur ton téléphone. Une fois la ligue configurée, l'app envoie toute seule tes nouveaux records :

- dès que le réseau revient pendant que l'app est ouverte ;
- sinon, à la prochaine ouverture de l'app (ou quand tu y reviens) ;
- si la base ne répond pas, elle réessaie toute seule, de plus en plus espacé (30 s, 1 min, 2 min… jusqu'à 15 min).

Dans **Classement → Ligue en ligne**, un message indique quand des records attendent d'être envoyés. Le bouton **Synchroniser** reste là pour forcer l'envoi.

**Règle du meilleur score** : avant d'envoyer, l'app compare ta fiche en ligne et celle du téléphone, et garde pour chaque exercice la meilleure valeur (le plus de reps ou de kilos, le temps le plus court). Un record moins bon ne remplace donc jamais un meilleur. Si la ligue a un meilleur record que ton téléphone (par exemple après une restauration de sauvegarde), il est récupéré. Seule exception : si tu corriges toi-même un record à la baisse dans ton profil, ta correction est respectée.

Rien à installer ni à créer en plus : la synchro passe par la même base Firebase gratuite, avec les mêmes règles. Sans ligue en ligne, tes records restent sur le téléphone et partent avec ton prochain code de partage.

## 4. Bien utiliser la caméra

| Exercice | Placement du téléphone |
|---|---|
| Pompes | Au sol, de profil, à 1,5–2 m. Tout le corps visible. |
| Squats | À hauteur de hanches, de profil, à 2–3 m. |
| Tractions | Face à la barre, à 2–3 m. Barre et mains dans le cadre. |
| Dips | De profil, à hauteur des barres, à 2 m. |
| Muscle-ups | Face à la barre, assez loin pour voir tes hanches passer au-dessus. |
| Gainage | Au sol, de profil, à 1,5 m. |

Une rep n'est comptée que si l'amplitude est complète (par exemple, coudes sous 95° puis bras tendus pour une pompe). Avec une bonne lumière et le corps entier dans le cadre, le comptage est fiable. Si la caméra rate une rep, le bouton **+1** corrige. Sans caméra, l'app propose de compter en touchant l'écran.

**Boss** : chaque donjon a 7 étages, de E à X. Une rep frappe le boss de 100 PV. Si tu enchaînes les reps en moins de 2,2 s, le combo augmente les dégâts jusqu'à ×1,30 : plus tu vas vite, plus le boss tombe vite.

## 5. Course

Lance le test 5 km ou 10 km dans l'onglet **Course**. L'app mesure la distance au GPS et compte tes pas avec l'accéléromètre (la longueur de pas est calculée à partir de ta taille et de ta cadence). Les passages à 5 km et 10 km sont chronométrés automatiquement et mettent à jour tes rangs.

**Important** : une application web s'arrête quand l'écran se verrouille. Garde l'app ouverte et l'écran allumé (téléphone au bras ou en main). Si tu cours avec une montre ou Strava, utilise **Saisir un temps**.

## 6. Comment les rangs sont calculés

Les rangs ne sont pas calculés par rapport à toi mais par rapport à des références externes :

- **Force** : charge maximale sur 1 rep divisée par ton poids de corps (tables de standards de force de Kilgore, Rippetoe et Pendlay, ExRx). Le max est estimé à partir de « charge × reps » (formule d'Epley). Exemple homme : développé couché à 1× ton poids = B, 2× = X.
- **Maîtrise du corps** : max de tractions, dips, pompes et muscle-ups d'affilée, et durée de gainage (barèmes de tests militaires et de street workout).
- **Vitesse** : temps sur 5 km. Homme : 23:30 = B, 15:00 = X (niveau élite).
- **Endurance** : temps sur 10 km. Homme : 49:00 = B, 31:30 = X.
- **Explosivité** : saut en longueur sans élan et détente verticale (normes des tests NFL et NBA).
- **Physique** : FFMI (indice de masse maigre, Kouri et al. 1995 : 25 ≈ maximum naturel) et pourcentage de masse grasse (formule Marine US si tu donnes tes tours de taille et de cou, sinon estimation par l'IMC).

Les barèmes femmes sont séparés. Un coefficient d'âge compare un ado ou un athlète de plus de 35–40 ans à l'équivalent adulte de sa performance. Ton rang global est la moyenne des six piliers ; un pilier non testé compte comme E. Tous les barèmes sont visibles dans l'app : **Profil → Voir tous les barèmes**.

Le programme suit un cycle de 4 semaines (100 %, 102,5 %, 105 %, puis décharge). Les charges et les séries sont calculées à partir de tes records, et ton pilier le plus faible reçoit un bloc en plus.

## 7. Sécurité

Échauffe-toi avant chaque séance et chaque boss. Si tu as moins de 18 ans, n'essaie pas de soulever ton maximum sur 1 rep : entre une charge que tu fais 3 à 5 fois, l'app calcule ton max. Arrête-toi en cas de douleur.

## Fichiers

- `index.html`, `css/`, `js/` : l'application.
- `vendor/mediapipe/` : la détection de posture MediaPipe (Google, licence Apache 2.0) et son modèle, inclus pour que l'app marche sans dépendre d'un autre site.
- `sw.js`, `manifest.webmanifest`, `icons/` : installation sur le téléphone et mode hors ligne.
- `tests/` : tests de la règle du meilleur score (`node --test tests/*.test.js`, Node 18 ou plus). Ce dossier n'est pas utile sur le site.
