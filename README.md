# Event Information Website

A Flask-based web application for displaying event information using markdown files organized in folders representing different tabs.

## Features

- Folder-based tab organization
- Markdown-based content management
- Responsive design for desktop and mobile
- Beautiful gradient backgrounds
- Easy content updates through markdown files
- Vercel deployment ready

## Project Structure

```
website/
├── api/                # API endpoints (for Vercel serverless)
├── content/            # Markdown content files organized by tabs
├── static/            # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── templates/         # Jinja2 HTML templates
├── app.py            # Main Flask application
├── requirements.txt   # Python dependencies
└── vercel.json       # Vercel deployment configuration
```

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Navigate to the website directory:**
   ```bash
   cd website
   ```

2. **Create a virtual environment:**

   Using venv:
   ```bash
   python -m venv venv
   ```

   Or using conda (if you have Anaconda installed):
   ```bash
   conda create -n event-website python=3.9
   conda activate event-website
   ```

3. **Activate the virtual environment:**

   On Windows (Command Prompt):
   ```bash
   venv\Scripts\activate
   ```

   On Windows (PowerShell):
   ```bash
   venv\Scripts\Activate.ps1
   ```

   On Windows (Git Bash):
   ```bash
   source venv/Scripts/activate
   ```

   On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

   If using conda:
   ```bash
   conda activate event-website
   ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up environment variables:**

   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update the values as needed:
   ```
   FLASK_ENV=development
   SECRET_KEY=your-secret-key-here
   PORT=5000
   ```

## Running the Application

### Development Mode

1. **Ensure your virtual environment is activated**

2. **Run the Flask application:**
   ```bash
   python app.py
   ```

   Or using Flask CLI:
   ```bash
   flask run
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`

### Testing the API

Test the health check endpoint:
```bash
curl http://localhost:5000/api/health
```

## Content Management

### Adding Tabs

Create a new folder in the `content/` directory. The folder name becomes the tab name.

Example:
```bash
mkdir content/national-day
```

### Adding Articles

Create markdown files inside the tab folders:

```markdown
# Article Title

Article content goes here...
```

Save as `content/national-day/article1.md`

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts to configure your deployment

## API Endpoints

- `GET /` - Homepage
- `GET /api/health` - Health check
- `GET /api/info` - API information
- `GET /api/tabs` - List all available tabs
- `GET /api/articles/<tab>` - Get articles for a specific tab
- `GET /api/article/<tab>/<article_id>` - Get specific article content

## Development Tips

- Keep markdown files organized in their respective tab folders
- Use descriptive file names for articles
- Test on both desktop and mobile viewports
- Monitor the `/api/health` endpoint for application status

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, you can change it in the `.env` file:
```
PORT=5001
```

### Module Not Found Errors

Ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Environment Variables Not Loading

Make sure python-dotenv is installed and the `.env` file exists in the website directory.

## License

This project is part of the actfunc repository.

