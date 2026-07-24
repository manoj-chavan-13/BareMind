import re

def sanitize_html(content: str) -> str:
    """
    Sanitize HTML string to prevent XSS attacks.
    Strips script tags, iframe/embed tags, event listeners (on*), and javascript: URLs.
    """
    if not content:
        return content

    # 1. Remove <script> ... </script>
    cleaned = re.sub(r'(?i)<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', content)
    
    # 2. Remove dangerous structural tags
    cleaned = re.sub(r'(?i)<(?:iframe|object|embed|applet|form|meta|base|link)\b[^>]*>', '', cleaned)
    cleaned = re.sub(r'(?i)<\/(?:iframe|object|embed|applet|form|meta|base|link)>', '', cleaned)

    # 3. Strip event handlers e.g. onclick=..., onload=...
    cleaned = re.sub(r'(?i)\s+on[a-z]+\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)', '', cleaned)

    # 4. Strip javascript: and vbscript: URIs
    cleaned = re.sub(r'(?i)href\s*=\s*["\']?\s*(?:javascript|vbscript):[^"\'>\s]*', 'href="#"', cleaned)
    cleaned = re.sub(r'(?i)src\s*=\s*["\']?\s*(?:javascript|vbscript):[^"\'>\s]*', 'src="#"', cleaned)

    return cleaned
