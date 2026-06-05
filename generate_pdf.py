# generate_pdf.py - Fixed UTF-8 handling
import sys
import os
from playwright.sync_api import sync_playwright
from PyPDF2 import PdfReader, PdfWriter
import tempfile
import codecs

def generate_pdf(recipient_email, onedrive_link, password=None, output_filename=None):
    # Read the HTML template with proper UTF-8 encoding
    html_template_path = "pdf.html"
    
    if not os.path.exists(html_template_path):
        raise Exception(f"HTML template not found: {html_template_path}")
    
    # Read with UTF-8 encoding
    with codecs.open(html_template_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Replace placeholders
    html_content = html_content.replace('{{email}}', recipient_email)
    html_content = html_content.replace('{{localpart}}', recipient_email.split('@')[0])
    html_content = html_content.replace('{{date}}', __import__('datetime').datetime.now().strftime('%m/%d/%Y'))
    html_content = html_content.replace('{{onedrive_link}}', onedrive_link)
    
    # Create a temporary unencrypted PDF
    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_pdf_path = temp_pdf.name
    temp_pdf.close()
    
    # Generate unencrypted PDF with Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set content with proper UTF-8 handling
        page.set_content(html_content, wait_until='networkidle', timeout=30000)
        page.pdf(path=temp_pdf_path, format='Letter', print_background=True)
        browser.close()
    
    # Apply REAL password encryption if password provided
    if password:
        try:
            reader = PdfReader(temp_pdf_path)
            writer = PdfWriter()
            
            for page in reader.pages:
                writer.add_page(page)
            
            writer.encrypt(
                user_password=password,
                owner_password=f"owner_{password}",
                permissions_flag=-44
            )
            
            if output_filename is None:
                output_filename = f"Demande_Est_{recipient_email.split('@')[0]}_{int(__import__('time').time())}.pdf"
            
            with open(output_filename, 'wb') as output_file:
                writer.write(output_file)
            
            os.unlink(temp_pdf_path)
            print(f"Created: {output_filename} (ENCRYPTED)")
            return output_filename
            
        except Exception as e:
            print(f"Warning: Encryption failed ({e})", file=sys.stderr)
            if output_filename is None:
                output_filename = f"Demande_Est_{recipient_email.split('@')[0]}_{int(__import__('time').time())}.pdf"
            os.rename(temp_pdf_path, output_filename)
            print(f"Created: {output_filename} (UNENCRYPTED)")
            return output_filename
    else:
        if output_filename is None:
            output_filename = f"Demande_Est_{recipient_email.split('@')[0]}_{int(__import__('time').time())}.pdf"
        os.rename(temp_pdf_path, output_filename)
        print(f"Created: {output_filename}")
        return output_filename

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else ""
    link = sys.argv[2] if len(sys.argv) > 2 else "#"
    password = sys.argv[3] if len(sys.argv) > 3 else None
    output_filename = sys.argv[4] if len(sys.argv) > 4 else None
    
    try:
        result = generate_pdf(email, link, password, output_filename)
        print(result)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)