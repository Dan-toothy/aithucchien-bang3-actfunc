import os
import frontmatter
from pathlib import Path
import markdown

class ContentManager:
    def __init__(self, content_dir='content'):
        self.content_dir = Path(content_dir)
        if not self.content_dir.exists():
            self.content_dir.mkdir()

    def get_tabs(self):
        tabs = []
        if not self.content_dir.is_dir():
            return tabs
        for tab_dir in self.content_dir.iterdir():
            if tab_dir.is_dir():
                tabs.append({'id': tab_dir.name, 'title': tab_dir.name.replace('-', ' ').title()})
        return tabs

    def get_articles_by_tab(self, tab_name):
        articles = []
        tab_dir = self.content_dir / tab_name
        if not tab_dir.is_dir():
            return articles
        for article_file in tab_dir.glob('*.md'):
            article = self.get_article(f"{tab_name}/{article_file.name}")
            if article:
                articles.append(article)
        return articles

    def get_article(self, file_key):
        article_path = self.content_dir / file_key
        if not article_path.exists():
            return None
        
        with open(article_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)
            html_content = markdown.markdown(post.content)
            
            return {
                'id': article_path.stem,
                'title': post.metadata.get('title', article_path.stem.replace('-', ' ').title()),
                'content': html_content,
                'metadata': post.metadata
            }

    def get_tab_metadata(self, tab_name):
        tab_dir = self.content_dir / tab_name
        if not tab_dir.is_dir():
            return None
        return {'id': tab_name, 'title': tab_name.replace('-', ' ').title()}

    def get_recent_articles(self, limit=5):
        # This is a placeholder. A real implementation would need to check file modification times.
        return []
