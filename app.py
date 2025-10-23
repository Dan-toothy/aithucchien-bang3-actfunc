import os
from flask import Flask, render_template, jsonify, request, abort, session
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from pathlib import Path

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__,
                static_folder='static',
                template_folder='template')

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['DEBUG'] = os.environ.get('FLASK_ENV', 'development') == 'development'
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = False

    # Enable CORS for API endpoints
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register blueprints
    from api.routes import api_bp
    app.register_blueprint(api_bp)

    # Health check endpoint (kept here for backward compatibility)
    @app.route('/health')
    def health_check_root():
        """Health check endpoint for monitoring."""
        return jsonify({
            'status': 'healthy',
            'message': 'Event Information Website API is running',
            'version': '1.0.0'
        }), 200

    # Home route
    @app.route('/')
    def index():
        """Render the homepage."""
        # Scan for content to display
        from api.content_manager import ContentManager
        cm = ContentManager('content')
        tabs = cm.get_tabs()
        recent_articles = cm.get_recent_articles(limit=5)
        return render_template('index.html', tabs=tabs, recent_articles=recent_articles)

    # Tab view route
    @app.route('/tab/<tab_name>')
    def view_tab(tab_name):
        """View articles in a specific tab."""
        from api.content_manager import ContentManager
        cm = ContentManager('content')
        articles = cm.get_articles_by_tab(tab_name)
        tab_metadata = cm.get_tab_metadata(tab_name)
        if not tab_metadata:
            abort(404)
        return render_template('tab.html', tab=tab_metadata, articles=articles)

    # Article view route
    @app.route('/article/<tab>/<path:article_id>')
    def view_article(tab, article_id):
        """View a specific article."""
        from api.content_manager import ContentManager
        cm = ContentManager('content')
        if not article_id.endswith('.md'):
            article_id += '.md'
        file_key = f"{tab}/{article_id}".replace('\\', '/')
        article = cm.get_article(file_key)
        if not article:
            abort(404)
        return render_template('article.html', article=article)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors."""
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        return render_template('404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors."""
        logger.error(f'Internal error: {error}')
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template('500.html'), 500

    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Run the development server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
