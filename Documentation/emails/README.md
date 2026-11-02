# Modèles d’e-mails Supabase Auth (français)

À coller dans le Dashboard Supabase : **Authentication → Emails → Templates**. Pour chaque modèle, remplacer l’objet et le corps (onglet « Source ») par ceux ci-dessous, puis enregistrer. Les variables `{{ .… }}` sont remplacées par Supabase à l’envoi : ne pas les traduire.

| Modèle Supabase | Fichier | Objet |
| --- | --- | --- |
| Confirm signup | [confirmation.html](confirmation.html) | Confirmez votre adresse e-mail — Universal Timeline |
| Invite user | [invitation.html](invitation.html) | Invitation à rejoindre Universal Timeline |
| Magic link | [lien-de-connexion.html](lien-de-connexion.html) | Votre lien de connexion — Universal Timeline |
| Change email address | [changement-email.html](changement-email.html) | Confirmez votre nouvelle adresse — Universal Timeline |
| Reset password | [reinitialisation-mot-de-passe.html](reinitialisation-mot-de-passe.html) | Réinitialisation de votre mot de passe — Universal Timeline |
| Reauthentication | [reauthentification.html](reauthentification.html) | Votre code de vérification — Universal Timeline |

Le modèle « Reset password » n’utilise pas `{{ .ConfirmationURL }}` mais `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery` : la page `/reset-password` vérifie ce jeton avec `verifyOtp`, ce qui fonctionne même si le lien est ouvert dans un autre navigateur que celui de la demande (le flux PKCE de `{{ .ConfirmationURL }}` l’exige). Le lien pointe toujours vers la Site URL, donc vers la production, même pour une demande faite en local.

## Points à vérifier

- **SMTP d’abord.** Sans SMTP personnalisé, Supabase n’envoie qu’aux membres de l’organisation (voir `server/AUTHENTICATION.md`). Réglages Hostinger : hôte `smtp.hostinger.com`, port `465`, utilisateur et expéditeur `florian@universaltimeline.net`, nom d’expéditeur `Universal Timeline`. Le mot de passe de la boîte est saisi par l’éditeur, jamais par un agent.
- **Site URL** : `https://universaltimeline.net` (Authentication → URL Configuration). Les modèles l’utilisent via `{{ .SiteURL }}` (politique de confidentialité, lien de réinitialisation).
- **Redirect URLs** : autoriser `https://universaltimeline.net/**` (retours vers `/login` après inscription et `/profile` après changement d’e-mail). Une URL de retour absente de la liste est remplacée par la Site URL.
- **Secure email change** (Authentication → Providers → Email) : activé, Supabase envoie le modèle « Change email address » à l’ancienne et à la nouvelle adresse, et les deux liens doivent être confirmés. L’interface le signale sans présumer du réglage.
- **Adresse de contact** : écrite en dur dans les modèles. Si `CONTACT_EMAIL` change dans `src/lib/legalDocuments.ts`, mettre les modèles à jour et les recoller.
- **Parcours** : « Mot de passe oublié ? » sur `/login` mène à `/reset-password` (demande, puis nouveau mot de passe) ; le changement d’adresse est dans Profil → Adresse e-mail. Invitation, lien magique et code de réauthentification ne sont pas utilisés par l’interface, leurs modèles sont prêts.
- **Test** : après collage, créer un compte avec une adresse extérieure (Gmail, Outlook) et vérifier la réception, l’affichage clair/sombre et le lien de confirmation. Contrôler aussi le dossier « Indésirables ».
