# AptosFit - GitHub Pages Deployment Guide

## 🚀 Automatic Deployment (Recommended)

This repository is configured to automatically deploy to GitHub Pages whenever you push to the `master` branch.

### Setup Steps:

1. **Enable GitHub Pages**
   - Go to your repository: https://github.com/redman220/AptosFit-Site
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment", select:
     - **Source**: GitHub Actions
   - Click **Save**

2. **Configure Custom Domain** (Optional)
   - Edit the file `public/CNAME` and replace `your-domain.com` with your actual domain
   - In GitHub: **Settings** → **Pages** → **Custom domain**
   - Enter your domain (e.g., `aptosfit.com`)
   - Click **Save**

3. **DNS Configuration** (for custom domain)
   Add these DNS records at your domain provider:
   ```
   Type: CNAME
   Name: www (or @)
   Value: redman220.github.io
   ```

   Or use A records:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

4. **Push to Deploy**
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin master
   ```

5. **Monitor Deployment**
   - Go to **Actions** tab in your repository
   - Watch the "Deploy to GitHub Pages" workflow
   - Once complete, your site will be live!

## 🛠️ Manual Deployment

If you prefer manual deployment:

```bash
# Install dependencies
npm install

# Build the web app
npm run build:web

# Deploy to GitHub Pages
npm run deploy
```

## 🌐 Access Your Site

After deployment, your site will be available at:
- **Default**: https://redman220.github.io/AptosFit-Site
- **Custom Domain**: https://your-domain.com (after DNS propagation)

## 📝 Local Development

Run the app locally:
```bash
npm install
npm run web
```

Open http://localhost:8081 in your browser.

## 🔧 Troubleshooting

### Build fails in GitHub Actions
- Check the Actions tab for error logs
- Ensure all dependencies are in `package.json`
- Verify the build works locally with `npm run build:web`

### Custom domain not working
- Wait 24-48 hours for DNS propagation
- Verify CNAME file exists in `public/CNAME`
- Check DNS records at your domain provider
- Enable "Enforce HTTPS" in GitHub Pages settings

### App loads but shows errors
- Check browser console for errors
- Verify backend API URL is correct in `utils/api.ts`
- Ensure CORS is configured on your backend

## 📦 What Gets Deployed

The `npm run build:web` command creates a production build in the `dist/` directory:
- Static HTML, CSS, and JavaScript files
- Optimized assets and images
- Service worker for PWA support
- All necessary fonts and icons

## 🎯 Next Steps

1. Replace `your-domain.com` in `public/CNAME` with your actual domain
2. Update backend API URL if needed
3. Push changes to trigger automatic deployment
4. Configure DNS records at your domain provider
5. Wait for deployment to complete
6. Visit your live site!
