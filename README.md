# Hurricane Isabel 3D Visualization

A 3D visualization of Hurricane Isabel using Three.js and Vite. This project displays wind direction, strength, and temperature data from the Weather Research and Forecasting (WRF) model.

## Features

- **3D Wind Visualization**: Streamlines showing wind direction and strength
- **Temperature Cut Plane**: Interactive temperature visualization
- **Camera Controls**: 
  - Left button: Pan the camera
  - Middle button: Zoom
  - Right button: Move the camera
- **Interactive Parameters**: Adjustable visualization settings

## Live Demo

Visit the live application: [Hurricane Isabel Visualization](https://natashaaak.github.io/hurricane/)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/natashaaak/hurricane.git
   cd hurricane
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment (Recommended)

1. Push your changes to the `main` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Your site will be available at `https://natashaaak.github.io/hurricane/`

### Manual Deployment

If you prefer manual deployment:

1. Install the gh-pages package:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

## GitHub Pages Setup

1. Go to your repository settings on GitHub
2. Navigate to "Pages" in the sidebar
3. Set the source to "GitHub Actions"
4. The site will be automatically deployed when you push to the main branch

## Project Structure

```
hurricane/
├── css/           # Stylesheets
├── data/          # Data files (images, textures, etc.)
├── js/            # JavaScript modules
├── index.html     # Main HTML file
├── vite.config.js # Vite configuration
└── package.json   # Dependencies and scripts
```

## Technologies Used

- **Three.js**: 3D graphics library
- **Vite**: Build tool and development server
- **GitHub Pages**: Hosting platform

## Data Source

The visualization uses data from the Weather Research and Forecasting (WRF) model, covering an area of 2000 × 2000 × 19.8 km around Hurricane Isabel from September 2003.

## License

This project is open source and available under the [MIT License](LICENSE).
