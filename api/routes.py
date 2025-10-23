from flask import Blueprint, jsonify
from .content_manager import ContentManager

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'message': 'API is running'
    })

@api_bp.route('/info')
def info():
    """API information endpoint."""
    return jsonify({
        'version': '1.0.0',
        'description': 'Event Information Website API'
    })

@api_bp.route('/tabs')
def get_tabs():
    """Get all available tabs."""
    cm = ContentManager('content')
    tabs = cm.get_tabs()
    return jsonify(tabs)

@api_bp.route('/articles/<tab>')
def get_articles(tab):
    """Get articles for a specific tab."""
    cm = ContentManager('content')
    articles = cm.get_articles_by_tab(tab)
    return jsonify(articles)

@api_bp.route('/article/<tab>/<article_id>')
def get_article(tab, article_id):
    """Get a specific article."""
    cm = ContentManager('content')
    file_key = f"{tab}/{article_id}"
    article = cm.get_article(file_key)
    if not article:
        return jsonify({'error': 'Article not found'}), 404
    return jsonify(article)
