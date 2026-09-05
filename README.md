To develop locally with Vercel's serverless functions:

```
npm install
vercel dev
```
```
open http://localhost:3000/api/save-contact
```

Available API routes:

- `POST /api/save-contact`
- `POST /api/admin-login`
- `GET /api/admin-contacts`
- `DELETE /api/admin-delete-contact?id=<contact-id>`

To build locally:

```
npm install
vercel build
```

To deploy:

```
npm install
vercel deploy
```
